import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/data";

const RESET_PASSWORD = "1234";

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true }
    });

    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(RESET_PASSWORD, 12);
    await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash, mustChangePassword: false }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}
