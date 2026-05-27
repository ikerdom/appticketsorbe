import { prisma } from "@/lib/prisma";
import { subHours, subDays } from "date-fns";

/**
 * Auto-cierra tickets sin actividad en las últimas 48h.
 * Solo afecta tickets ABIERTO o EN_CURSO que no estén archivados.
 */
export async function autoCloseStaleTickets() {
  const threshold = subHours(new Date(), 48);
  const result = await prisma.ticket.updateMany({
    where: {
      estado: { not: "RESUELTO" },
      archivadoAt: null,
      updatedAt: { lt: threshold }
    },
    data: {
      estado: "RESUELTO",
      resueltoAt: new Date(),
      notaResolucion: "Cerrado automáticamente por inactividad (48 h sin actividad)."
    }
  });
  return result.count;
}

/**
 * Archiva tickets resueltos hace más de 7 días.
 * Van al histórico y desaparecen del panel principal.
 */
export async function autoArchiveResolvedTickets() {
  const threshold = subDays(new Date(), 7);
  const result = await prisma.ticket.updateMany({
    where: {
      estado: "RESUELTO",
      archivadoAt: null,
      resueltoAt: { not: null, lt: threshold }
    },
    data: {
      archivadoAt: new Date()
    }
  });
  return result.count;
}
