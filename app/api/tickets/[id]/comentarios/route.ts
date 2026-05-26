import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comentarioSchema } from "@/lib/validations";
import { puedeVerTicket } from "@/lib/permisos";
import { requireCurrentUser } from "@/lib/data";
import { sendTicketNotification } from "@/lib/notifications";
import { logTicketAction } from "@/lib/audit";
import { markTicketRead } from "@/lib/lecturas";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data = comentarioSchema.parse(await request.json());

    const comentario = await prisma.comentario.create({
      data: {
        contenido: data.contenido,
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

    const [creador, asignado, participantes] = await Promise.all([
      prisma.user.findUnique({ where: { id: ticket.creadorId }, select: { id: true } }),
      ticket.asignadoId ? prisma.user.findUnique({ where: { id: ticket.asignadoId }, select: { id: true } }) : Promise.resolve(null),
      prisma.comentario.findMany({ where: { ticketId: ticket.id }, select: { autorId: true } })
    ]);
    const recipients = Array.from(
      new Set([creador?.id, asignado?.id, ...participantes.map((item) => item.autorId)].filter((id): id is string => Boolean(id && id !== user.id)))
    );

    await sendTicketNotification({
      toUserIds: recipients,
      tipo: "comentario_nuevo",
      ticketId: ticket.id,
      ticketNumero: ticket.numero,
      titulo: ticket.titulo,
      mensaje: "Se ha añadido un nuevo comentario al ticket."
    });

    return NextResponse.json({ comentario }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo comentar" }, { status: 400 });
  }
}
