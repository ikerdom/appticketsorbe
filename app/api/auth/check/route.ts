import { NextRequest, NextResponse } from "next/server";
import { normalizeLoginEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeLoginEmail(String(body.email ?? ""));

    if (!email) {
      return NextResponse.json({ needsPassword: false });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { rol: true, passwordHash: true }
    });

    // Todos los usuarios con contraseña configurada deben introducirla
    const needsPassword = Boolean(user && user.passwordHash);
    return NextResponse.json({ needsPassword });
  } catch {
    return NextResponse.json({ needsPassword: false });
  }
}
