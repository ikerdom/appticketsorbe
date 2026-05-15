"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Mail, MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PRIORIDAD_COLOR, PRIORIDAD_LABELS } from "@/lib/constants";
import { formatRelativeEs } from "@/lib/dates";
import type { TicketCardData } from "@/types/ticket";

export function SortableTicketCard({ ticket }: { ticket: TicketCardData }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    data: { estado: ticket.estado }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    borderLeft: `3px solid ${ticket.empresaDestino.color || "#64748b"}`
  };

  const destinos = ticket.destinos.filter((dest) => !dest.empresa.isGlobalTarget);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab space-y-3 rounded-2xl p-4 shadow-sm transition hover:shadow-md active:cursor-grabbing"
      role="article"
      aria-label={`Ticket ${ticket.numero}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">#{String(ticket.numero).padStart(3, "0")}</p>
          <Link href={`/tickets/${ticket.id}`} className="line-clamp-2 text-sm font-semibold hover:underline">
            {ticket.titulo}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {ticket.unread ? <span className="h-2.5 w-2.5 rounded-full bg-blue-500" title="Comentarios sin leer" /> : null}
          <Badge className={PRIORIDAD_COLOR[ticket.prioridad]}>
            <AlertTriangle className="mr-1 h-3 w-3" />
            {PRIORIDAD_LABELS[ticket.prioridad]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground">Empresa afectada:</span>
        {destinos.map((destino) => (
          <Badge
            key={destino.id}
            className="border-transparent text-white"
            style={{ backgroundColor: destino.empresa.color || "#64748b" }}
          >
            {destino.empresa.nombre}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Categoría: {ticket.categoriaCustom || ticket.categoria}</span>
        <span>{ticket.asignado ? `En curso por: ${ticket.asignado.email}` : "Sin coger"}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {ticket.contactoTelefono ? (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> {ticket.contactoTelefono}
          </span>
        ) : null}
        {ticket.contactoEmail ? (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> {ticket.contactoEmail}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatRelativeEs(ticket.createdAt)}</span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" /> {ticket._count.comentarios}
        </span>
      </div>
    </Card>
  );
}
