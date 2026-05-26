import { NextRequest, NextResponse } from "next/server";
import { isAllowedEmail, normalizeLoginEmail } from "@/lib/auth-email";
import { legacyNormalizeEmail } from "@/lib/company-config";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeLoginEmail(String(body.email ?? ""));

    if (!email) {
      return NextResponse.json({ status: "unknown" });
    }

    // Buscar por email exacto y por versión legacy (por si fue creado con la normalización antigua)
    const emailLegacy = legacyNormalizeEmail(email);
    const user = await prisma.user.findFirst({
      where: { email: { in: Array.from(new Set([email, emailLegacy])) } },
      select: { passwordHash: true, activo: true }
    });

    if (user && user.passwordHash) {
      return NextResponse.json({ status: "has_password" });
    }

    if (isAllowedEmail(email)) {
      return NextResponse.json({ status: "set_password" });
    }

    return NextResponse.json({ status: "unknown" });
  } catch {
    return NextResponse.json({ status: "unknown" });
  }
}
