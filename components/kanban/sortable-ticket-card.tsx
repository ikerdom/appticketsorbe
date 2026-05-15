"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle } from "lucide-react";
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
  const principal = destinos[0]?.empresa ?? ticket.empresaDestino;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab space-y-2 rounded-2xl p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
      role="article"
      aria-label={`Ticket ${ticket.numero}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">#{String(ticket.numero).padStart(3, "0")}</p>
          <Link href={`/tickets/${ticket.id}`} className="line-clamp-2 text-sm font-semibold hover:underline">
            {ticket.titulo}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={`${PRIORIDAD_COLOR[ticket.prioridad]} text-xs`}>
            <AlertTriangle className="mr-1 h-3 w-3" />
            {PRIORIDAD_LABELS[ticket.prioridad]}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Empresa:</span>
        <Badge className="border-transparent text-white" style={{ backgroundColor: principal.color || "#64748b" }}>
          {principal.nombre}
        </Badge>
        {destinos.length > 1 ? <span className="text-muted-foreground">+{destinos.length - 1}</span> : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{ticket.categoriaCustom || ticket.categoria}</span>
        <span>{formatRelativeEs(ticket.createdAt)}</span>
      </div>
    </Card>
  );
}
