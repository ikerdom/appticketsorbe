import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/data";
import { ADMIN_PASSWORD } from "@/lib/auth/config";

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, rol: true }
    });

    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (target.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo se puede resetear la contraseña de administradores." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash, mustChangePassword: false }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}
