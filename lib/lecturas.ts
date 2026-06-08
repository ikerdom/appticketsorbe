import { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function markTicketRead(ticketId: string, usuarioId: string) {
  await prisma.lecturaTicket.upsert({
    where: {
      ticketId_usuarioId: {
        ticketId,
        usuarioId
      }
    },
    update: { ultimaVisita: new Date() },
    create: { ticketId, usuarioId }
  });
}

export async function ticketUnreadMap(ticketIds: string[], user: { id: string; rol: Rol }) {
  if (ticketIds.length === 0) return {} as Record<string, boolean>;

  const [lecturas, ultimosComentarios] = await Promise.all([
    prisma.lecturaTicket.findMany({
      where: {
        usuarioId: user.id,
        ticketId: { in: ticketIds }
      }
    }),
    prisma.comentario.groupBy({
      by: ["ticketId"],
      where: { ticketId: { in: ticketIds } },
      _max: { createdAt: true }
    })
  ]);

  const lecturaMap = new Map(lecturas.map((l) => [l.ticketId, l.ultimaVisita]));
  const result: Record<string, boolean> = {};

  for (const t of ticketIds) {
    const lastRead = lecturaMap.get(t);
    const lastComment = ultimosComentarios.find((c) => c.ticketId === t)?._max.createdAt;
    result[t] = !!lastComment && (!lastRead || lastComment > lastRead);
  }

  return result;
}
