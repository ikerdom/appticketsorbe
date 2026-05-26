import { NextRequest, NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/auth-email";
import { normalizeLoginEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeLoginEmail(String(body.email ?? ""));

    if (!email) {
      return NextResponse.json({ status: "unknown" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true, activo: true }
    });

    // Usuario existente con contraseña
    if (user && user.passwordHash) {
      return NextResponse.json({ status: "has_password" });
    }

    // Usuario existente sin contraseña, o usuario nuevo pero dominio permitido
    if (isAllowedEmail(email)) {
      return NextResponse.json({ status: "set_password" });
    }

    return NextResponse.json({ status: "unknown" });
  } catch {
    return NextResponse.json({ status: "unknown" });
  }
}
