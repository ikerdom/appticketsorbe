import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    await prisma.notification.updateMany({
      where: { usuarioId: user.id, leida: false },
      data: { leida: true }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudieron marcar notificaciones" }, { status: 400 });
  }
}

