"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PRIORIDAD_LABELS } from "@/lib/constants";
import { formatRelativeEs } from "@/lib/dates";
import type { TicketCardData } from "@/types/ticket";
import type { Prioridad } from "@prisma/client";

/** Returns SLA status based on ticket age in hours */
function getSlaStatus(createdAt: Date, estado: string): { label: string; color: string; ring: string } | null {
  if (estado === "RESUELTO") return null;
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours < 24) return { label: `${Math.round(hours)}h`, color: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" };
  if (hours < 72) return { label: `${Math.floor(hours / 24)}d`, color: "bg-amber-100 text-amber-700", ring: "ring-amber-200" };
  return { label: `${Math.floor(hours / 24)}d ⚠`, color: "bg-red-100 text-red-700", ring: "ring-red-200" };
}

const PRIORIDAD_DOT: Record<Prioridad, string> = {
  CRITICA: "bg-red-500",
  ALTA: "bg-orange-500",
  MEDIA: "bg-yellow-400",
  BAJA: "bg-slate-300"
};

const PRIORIDAD_TEXT: Record<Prioridad, string> = {
  CRITICA: "text-red-600",
  ALTA: "text-orange-600",
  MEDIA: "text-yellow-600",
  BAJA: "text-slate-500"
};

export function SortableTicketCard({
  ticket,
  isAdmin,
  onTake
}: {
  ticket: TicketCardData;
  isAdmin?: boolean;
  onTake?: (ticketId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    data: { estado: ticket.estado }
  });

  const companyColor = ticket.empresaDestino.color || "#64748b";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    borderLeft: `3px solid ${companyColor}`
  };

  const destinos = ticket.destinos.filter((dest) => !dest.empresa.isGlobalTarget);
  const principal = destinos[0]?.empresa ?? ticket.empresaDestino;
  const categoria = ticket.categoriaCustom || ticket.categoria;
  const sla = getSlaStatus(ticket.createdAt, ticket.estado);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-900/5 transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
      role="article"
      aria-label={`Ticket ${ticket.numero}`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {ticket.unread && (
            <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" title="Sin leer" />
          )}
          <span className="font-mono text-[10px] font-bold text-slate-400">
            #{String(ticket.numero).padStart(4, "0")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {sla && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${sla.color} ${sla.ring}`}>
              {sla.label}
            </span>
          )}
          <div className={`h-2 w-2 rounded-full ${PRIORIDAD_DOT[ticket.prioridad]}`} title={PRIORIDAD_LABELS[ticket.prioridad]} />
          <span className={`text-[11px] font-semibold ${PRIORIDAD_TEXT[ticket.prioridad]}`}>
            {PRIORIDAD_LABELS[ticket.prioridad]}
          </span>
        </div>
      </div>

      <Link href={`/tickets/${ticket.id}`} className="block mb-2">
        <p className={`line-clamp-2 text-sm font-semibold leading-snug hover:text-indigo-600 ${ticket.unread ? "text-slate-900" : "text-slate-700"}`}>
          {ticket.titulo}
        </p>
      </Link>

      {ticket.descripcion ? (
        <p
          className="mb-2 line-clamp-3 text-[11px] leading-relaxed text-slate-500"
          title={ticket.descripcion.length > 500 ? ticket.descripcion.slice(0, 500) + "…" : ticket.descripcion}
        >
          {ticket.descripcion}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge
            className="border-transparent px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
            style={{ backgroundColor: principal.color || "#64748b" }}
          >
            {principal.nombre}
          </Badge>
          {destinos.length > 1 ? (
            <span className="text-[11px] text-slate-400">+{destinos.length - 1}</span>
          ) : null}
        </div>
        <span className="text-[11px] text-slate-400">{formatRelativeEs(ticket.createdAt)}</span>
      </div>

      <p className="mt-2 text-[11px] text-slate-400 truncate">
        {categoria ? <>{categoria} · </> : null}
        <span className="text-indigo-400">{ticket.creador.email}</span>
      </p>

      {isAdmin && ticket.estado === "ABIERTO" && onTake ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTake(ticket.id); }}
          className="mt-2.5 w-full rounded-lg bg-amber-500 px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-600 active:scale-95"
        >
          → En curso
        </button>
      ) : null}
    </Card>
  );
}
