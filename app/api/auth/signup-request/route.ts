import { NextRequest, NextResponse } from "next/server";
import { isAllowedEmail, isEmailFormat, normalizeLoginEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const nombre = String(body.nombre ?? "").trim();
    const email = normalizeLoginEmail(String(body.email ?? ""));

    if (!nombre || !email || !isEmailFormat(email) || !isAllowedEmail(email)) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    const domain = email.split("@")[1] ?? "";
    const empresa = await prisma.empresa.findFirst({
      where: { dominio: domain, isActive: true, isGlobalTarget: false, deletedAt: null },
      select: { id: true, nombre: true }
    });

    await prisma.signupRequest.create({
      data: {
        nombre,
        email,
        empresaId: empresa?.id ?? null,
        estado: "PENDIENTE"
      }
    });

    const admins = await prisma.user.findMany({
      where: { rol: "ADMIN", activo: true },
      select: { id: true }
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          usuarioId: admin.id,
          tipo: "solicitud_alta",
          mensaje: `Nueva solicitud de alta: ${email} (${empresa?.nombre ?? "empresa no detectada"}).`
        }))
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la solicitud." }, { status: 400 });
  }
}
