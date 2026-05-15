import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import { markTicketRead } from "@/lib/lecturas";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentPageUser();

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      empresaOrigen: true,
      empresaDestino: true,
      destinos: { include: { empresa: true } },
      creador: { select: { id: true, email: true, nombre: true, name: true } },
      asignado: { select: { id: true, email: true, nombre: true, name: true, image: true } },
      comentarios: {
        include: { autor: { select: { id: true, email: true, nombre: true, name: true } } },
        orderBy: { createdAt: "asc" }
      },
      adjuntos: { orderBy: { createdAt: "desc" } },
      historial: {
        include: {
          autor: { select: { id: true, email: true, nombre: true, name: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!ticket || !puedeVerTicket(user, ticket)) {
    notFound();
  }

  await markTicketRead(ticket.id, user.id);

  return <TicketDetailView ticket={ticket} isAdmin={user.rol === "ADMIN"} />;
}
