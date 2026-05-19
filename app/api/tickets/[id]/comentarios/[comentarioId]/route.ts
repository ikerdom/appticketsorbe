import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; comentarioId: string } }
) {
  try {
    const user = await requireCurrentUser();

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const comentario = await prisma.comentario.findUnique({
      where: { id: params.comentarioId },
      select: { id: true, ticketId: true, autorId: true }
    });

    if (!comentario || comentario.ticketId !== params.id) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const canDelete = user.rol === "ADMIN" || comentario.autorId === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.comentario.delete({ where: { id: params.comentarioId } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
}
