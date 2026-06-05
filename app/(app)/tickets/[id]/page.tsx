import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import { markTicketRead } from "@/lib/lecturas";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: { titulo: true, descripcion: true, numero: true }
  });
  if (!ticket) return { title: "Ticket no encontrado" };

  const num = `#${String(ticket.numero).padStart(4, "0")}`;
  const title = `Incidencia ${num} — ${ticket.titulo} · Tickets`;
  const description = ticket.descripcion.slice(0, 160) + (ticket.descripcion.length > 160 ? "…" : "");
  const url = `${APP_URL}/tickets/${params.id}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "article", url },
    twitter: { card: "summary", title, description }
  };
}

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
      notas: {
        where: { esAdmin: true },
        include: { autor: { select: { id: true, email: true, nombre: true, name: true } } },
        orderBy: { createdAt: "asc" }
      },
      historial: {
        include: {
          autor: { select: { id: true, email: true, nombre: true, name: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!ticket) notFound();
  if (!puedeVerTicket(user, ticket)) redirect("/forbidden");

  await markTicketRead(ticket.id, user.id);

  return <TicketDetailView ticket={ticket} isAdmin={user.rol === "ADMIN"} currentUserId={user.id} />;
}
