import { prisma } from "@/lib/prisma";
import { logTicketAction } from "@/lib/audit";

/**
 * Asocia adjuntos huérfanos (subidos vía /api/adjuntos durante la creación
 * de un ticket, antes de que existiera) al ticket recién creado. Llamado
 * desde POST /api/tickets justo después de crear el ticket.
 */
export async function associarAdjuntosHuerfanos(adjuntoIds: string[], ticketId: string, autorId: string) {
  if (!adjuntoIds.length) return;
  const { count } = await prisma.adjunto.updateMany({
    where: { id: { in: adjuntoIds }, ticketId: null },
    data: { ticketId }
  });
  if (count > 0) {
    await logTicketAction({
      ticketId,
      autorId,
      accion: "ADJUNTO_SUBIDO",
      detalle: { total: count, origen: "descripcion_inline" }
    }).catch(() => null);
  }
}
