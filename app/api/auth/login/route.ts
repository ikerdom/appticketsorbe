import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";
import { APP_ROLE_COOKIE, APP_SESSION_COOKIE, cookieCommonOptions, createSessionForUser } from "@/lib/auth-session";
import { isAllowedEmail, isEmailFormat, normalizeLoginEmail } from "@/lib/auth-email";
import { legacyNormalizeEmail, resolveActiveDomain } from "@/lib/company-config";
import { prisma } from "@/lib/prisma";

function getClientIp(request: NextRequest) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = String(body.email ?? "");
    const emailInput = emailRaw.trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    const email = normalizeLoginEmail(emailRaw);
    console.log(`[login] request: ${email || "<empty>"}`);

    if (!email || !isEmailFormat(email)) {
      return NextResponse.json({ ok: false, message: "Datos de acceso no válidos." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const limit = checkRateLimit(`login-ip:${ip}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, message: "Demasiados intentos. Prueba en un minuto." }, { status: 429 });
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ ok: false, message: "La contraseña debe tener al menos 4 caracteres." }, { status: 400 });
    }

    const emailLegacy = legacyNormalizeEmail(email);
    const emailCandidatos = Array.from(new Set([email, emailLegacy]));
    let user = await prisma.user.findFirst({
      where: { email: { in: emailCandidatos } },
      select: { id: true, email: true, rol: true, activo: true, passwordHash: true }
    });

    const allowedByRaw = isAllowedEmail(emailInput);
    const allowedByNormalized = isAllowedEmail(email);
    const allowed = allowedByRaw || allowedByNormalized;

    if (!user) {
      if (!allowed) {
        console.warn(`[login] no autorizado: ${email}`);
        return NextResponse.json({ ok: false, message: "No tienes acceso a esta aplicacion" }, { status: 401 });
      }

      const [, rawDomain = ""] = email.split("@");
      const resolvedDomain = resolveActiveDomain(rawDomain);
      // Buscar por dominio resuelto, dominio original, o cualquier variante conocida
      const candidatos = Array.from(new Set([resolvedDomain, rawDomain]));
      const empresa = await prisma.empresa.findFirst({
        where: { dominio: { in: candidatos }, isActive: true, isGlobalTarget: false, deletedAt: null },
        select: { id: true }
      });

      if (!empresa) {
        console.error(`[login] empresa no encontrada para dominios: ${candidatos.join(", ")}`);
        return NextResponse.json({ ok: false, message: "No tienes acceso a esta aplicacion" }, { status: 401 });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: {
          email,
          rol: "USER",
          empresaId: empresa.id,
          activo: true,
          passwordHash,
          mustChangePassword: false
        },
        select: { id: true, email: true, rol: true, activo: true, passwordHash: true }
      });
      console.log(`[login] nuevo usuario creado: ${email}`);
    } else {
      if (!user.activo) {
        return NextResponse.json({ ok: false, message: "Usuario desactivado" }, { status: 423 });
      }

      if (!user.passwordHash) {
        // Primer login: dominio permitido → establecer contraseña
        if (!allowed) {
          return NextResponse.json({ ok: false, message: "No tienes acceso a esta aplicacion" }, { status: 401 });
        }
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, mustChangePassword: false }
        });
        user = { ...user, passwordHash };
        console.log(`[login] contraseña establecida para: ${email}`);
      } else {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return NextResponse.json({ ok: false, message: "Contraseña incorrecta." }, { status: 401 });
        }
      }
    }

    if (!user.activo) {
      return NextResponse.json({ ok: false, message: "Usuario desactivado" }, { status: 423 });
    }

    const session = await createSessionForUser({ id: user.id, rol: user.rol });

    const response = NextResponse.json({
      ok: true,
      role: user.rol,
      redirect: "/"
    });

    response.cookies.set(APP_SESSION_COOKIE, session.token, cookieCommonOptions(session.expires));
    response.cookies.set(APP_ROLE_COOKIE, user.rol, { ...cookieCommonOptions(session.expires), httpOnly: false });

    return response;
  } catch (error) {
    console.error("[login] internal error", error);
    return NextResponse.json({ ok: false, message: "Error interno al iniciar sesión." }, { status: 500 });
  }
}
