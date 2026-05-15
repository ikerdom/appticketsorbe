import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const updated = await prisma.notification.updateMany({
      where: { id: params.id, usuarioId: user.id },
      data: { leida: true }
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 400 });
  }
}

