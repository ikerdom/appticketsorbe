import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeVerTicket, puedeEditarComentario } from "@/lib/permisos";

async function getTicketAndComment(ticketId: string, comentarioId: string) {
  const [ticket, comentario] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    }),
    prisma.comentario.findUnique({
      where: { id: comentarioId },
      select: { id: true, ticketId: true, autorId: true, contenido: true }
    })
  ]);
  return { ticket, comentario };
}

// PATCH — editar contenido del comentario (autor o admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; comentarioId: string } }
) {
  try {
    const user = await requireCurrentUser();
    const { ticket, comentario } = await getTicketAndComment(params.id, params.comentarioId);

    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!comentario || comentario.ticketId !== params.id) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    if (!puedeEditarComentario(user, comentario)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const contenido = String(body.contenido ?? "").trim();
    if (!contenido) {
      return NextResponse.json({ error: "El contenido no puede estar vacío" }, { status: 400 });
    }

    const updated = await prisma.comentario.update({
      where: { id: params.comentarioId },
      data: { contenido },
      include: { autor: { select: { id: true, email: true, nombre: true, name: true } } }
    });

    return NextResponse.json({ comentario: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo editar el comentario" }, { status: 500 });
  }
}

// DELETE — deshabilitado: los comentarios no se pueden borrar
export async function DELETE() {
  return NextResponse.json(
    { error: "Los comentarios no se pueden eliminar." },
    { status: 405 }
  );
}
