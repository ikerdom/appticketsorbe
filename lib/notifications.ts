import { prisma } from "@/lib/prisma";

const enabled = process.env.NOTIFICATIONS_ENABLED !== "false";

function uniqUserIds(ids: (string | null | undefined)[]) {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export async function sendTicketNotification(params: {
  toUserIds: (string | null | undefined)[];
  tipo: "ticket_creado" | "comentario_nuevo" | "estado_cambiado" | "asignado";
  ticketId: string;
  ticketNumero: number;
  titulo: string;
  mensaje: string;
}) {
  if (!enabled) return;

  const recipients = uniqUserIds(params.toUserIds);
  if (recipients.length === 0) return;

  const title = `[Incidencia #${String(params.ticketNumero).padStart(3, "0")}] ${params.titulo}`;

  await prisma.notification.createMany({
    data: recipients.map((usuarioId) => ({
      usuarioId,
      tipo: params.tipo,
      ticketId: params.ticketId,
      mensaje: `${title} · ${params.mensaje}`
    }))
  });
}
