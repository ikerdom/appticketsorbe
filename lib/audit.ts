import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logTicketAction(params: {
  ticketId: string;
  autorId?: string | null;
  accion: string;
  detalle?: unknown;
}) {
  await prisma.historialTicket.create({
    data: {
      ticketId: params.ticketId,
      autorId: params.autorId ?? null,
      accion: params.accion,
      detalle: (params.detalle ?? undefined) as Prisma.InputJsonValue | undefined
    }
  });
}
