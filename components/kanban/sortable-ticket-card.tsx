"use client";

import { useState } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Check, Link2, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PRIORIDAD_LABELS } from "@/lib/constants";
import { formatRelativeEs } from "@/lib/dates";
import type { TicketCardData } from "@/types/ticket";
import type { Prioridad } from "@prisma/client";

const SLA_HORAS: Record<string, number> = {
  CRITICA: 4,
  ALTA: 24,
  MEDIA: 72,
  BAJA: 120
};

/** Returns SLA status based on ticket age vs. priority-specific SLA limit */
function getSlaStatus(createdAt: Date, estado: string, prioridad: string): { label: string; color: string; ring: string; pulse?: boolean } | null {
  if (estado === "RESUELTO" || estado === "BLOQUEADO") return null; // SLA pausado mientras está bloqueado
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const limit = SLA_HORAS[prioridad] ?? 72;
  const label = hours < 24 ? `${Math.round(hours)}h` : `${Math.floor(hours / 24)}d`;
  if (hours < limit * 0.5) return { label, color: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" };
  if (hours < limit) return { label, color: "bg-amber-100 text-amber-700", ring: "ring-amber-200" };
  return { label: `${label} ⚠`, color: "bg-red-100 text-red-700", ring: "ring-red-200", pulse: prioridad === "CRITICA" };
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
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/public/tickets/t/${ticket.numero}`;
    try { await navigator.clipboard.writeText(url); }
    catch { const i = document.createElement("input"); i.value = url; document.body.appendChild(i); i.select(); document.execCommand("copy"); document.body.removeChild(i); }
    setLinkCopied(true);
    toast.success("Enlace público copiado");
    setTimeout(() => setLinkCopied(false), 2000);
  }

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
  const sla = getSlaStatus(ticket.createdAt, ticket.estado, ticket.prioridad);

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
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
            <Calendar className="h-2.5 w-2.5" />
            {formatRelativeEs(ticket.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {sla && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${sla.color} ${sla.ring} ${sla.pulse ? "animate-pulse" : ""}`}>
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

      {ticket.estado === "BLOQUEADO" && ticket.motivoBloqueo && (
        <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5">
          <Lock className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-red-600">Bloqueado · {formatRelativeEs(ticket.updatedAt)}</p>
            <p className="text-[11px] leading-snug text-red-500">{ticket.motivoBloqueo}</p>
          </div>
        </div>
      )}

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
      </div>

      <div className="mt-2 flex items-center justify-between gap-1">
        <p className="min-w-0 truncate text-[11px] text-slate-400">
          {categoria ? <>{categoria} · </> : null}
          <span className="text-indigo-400">{ticket.creador.email}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {ticket._count.comentarios > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              <MessageCircle className="h-2.5 w-2.5" />
              {ticket._count.comentarios}
            </span>
          )}
          {ticket.asignado && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold uppercase text-indigo-700 ring-1 ring-indigo-200"
              title={ticket.asignado.nombre ?? ticket.asignado.name ?? ticket.asignado.email}
            >
              {(ticket.asignado.nombre ?? ticket.asignado.name ?? ticket.asignado.email ?? "?").slice(0, 2)}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copiar enlace"
            className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            {linkCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

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
