import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { comentarioSchema } from "@/lib/validations";
import { puedeVerTicket } from "@/lib/permisos";
import { requireCurrentUser } from "@/lib/data";
import { sendTicketNotification } from "@/lib/notifications";
import { logTicketAction } from "@/lib/audit";
import { markTicketRead } from "@/lib/lecturas";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { isRichContentEmpty } from "@/lib/rich-content";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true, nombre: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = comentarioSchema.parse(await request.json());
    const contenido = sanitizeRichText(data.contenido);
    if (isRichContentEmpty(contenido)) {
      return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 });
    }

    const comentario = await prisma.comentario.create({
      data: {
        contenido,
        ticketId: ticket.id,
        autorId: user.id
      },
      include: {
        autor: { select: { id: true, email: true, nombre: true, name: true } }
      }
    });
    await markTicketRead(ticket.id, user.id);

    await logTicketAction({
      ticketId: ticket.id,
      autorId: user.id,
      accion: "COMENTARIO_NUEVO",
      detalle: { comentarioId: comentario.id }
    });

    // creadorId/asignadoId ya son el id que necesitamos — no hace falta
    // volver a consultar User solo para confirmar que existen.
    const participantes = await prisma.comentario.findMany({ where: { ticketId: ticket.id }, select: { autorId: true } });
    const recipients = Array.from(
      new Set([ticket.creadorId, ticket.asignadoId, ...participantes.map((item) => item.autorId)].filter((id): id is string => Boolean(id && id !== user.id)))
    );

    const empresaNombre = ticket.destinos.find((destino) => !destino.empresa.isGlobalTarget)?.empresa.nombre ?? "Incidencia";
    await sendTicketNotification({
      toUserIds: recipients,
      tipo: "comentario_nuevo",
      ticketId: ticket.id,
      ticketNumero: ticket.numero,
      titulo: ticket.titulo,
      mensaje: "Se ha añadido un nuevo comentario al ticket.",
      empresaNombre
    });

    return NextResponse.json({ comentario }, { status: 201 });
  } catch (error) {
    console.error(`[POST /api/tickets/${params.id}/comentarios] error al comentar:`, error);
    if (error instanceof ZodError) {
      const message = error.errors[0]?.message ?? "Revisa el comentario.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo enviar el comentario. Si el problema persiste, contacta con Iker." }, { status: 500 });
  }
}
