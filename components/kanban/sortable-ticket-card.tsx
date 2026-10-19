"use client";

import { useState } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Link2, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PRIORIDAD_LABELS } from "@/lib/constants";
import { formatDateTimeEs, formatRelativeEs } from "@/lib/dates";
import { decodeEmailForDisplay } from "@/lib/format";
import type { TicketCardData } from "@/types/ticket";
import type { Prioridad } from "@prisma/client";

const SLA_HORAS: Record<string, number> = {
  CRITICA: 4,
  ALTA: 24,
  MEDIA: 72,
  BAJA: 120
};

function getSlaStatus(createdAt: Date, estado: string, prioridad: string): { label: string; color: string; ring: string; pulse?: boolean } | null {
  if (estado === "RESUELTO" || estado === "BLOQUEADO" || estado === "QA") return null;
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
  const [showMotivo, setShowMotivo] = useState(false);

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
  // Subtle company tint: hex color + "14" = ~8% opacity
  const companyBg = companyColor.startsWith("#") ? companyColor + "14" : companyColor;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeft: `3px solid ${companyColor}`,
    backgroundColor: companyBg
  };

  const sla = getSlaStatus(ticket.createdAt, ticket.estado, ticket.prioridad);

  // Person: prefer contacto name, then creador display name, then short email
  const persona: string = ticket.contactoNombre
    || ticket.creador.nombre
    || ticket.creador.name
    || decodeEmailForDisplay(ticket.creador.email).split("@")[0];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-xl p-2.5 shadow-sm ring-1 ring-slate-900/5 transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
      role="article"
      aria-label={`Ticket ${ticket.numero}`}
    >
      {/* Fila superior: número + SLA  |  prioridad */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {ticket.unread && (
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" title="Sin leer" />
          )}
          <span className="font-mono text-[10px] font-bold text-slate-400">
            #{String(ticket.numero).padStart(4, "0")}
          </span>
          <span className="text-[10px] text-slate-400">{formatRelativeEs(ticket.createdAt)}</span>
          {sla && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${sla.color} ${sla.ring} ${sla.pulse ? "animate-pulse" : ""}`}>
              {sla.label}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className={`h-1.5 w-1.5 rounded-full ${PRIORIDAD_DOT[ticket.prioridad]}`} />
          <span className={`text-[11px] font-semibold ${PRIORIDAD_TEXT[ticket.prioridad]}`}>
            {PRIORIDAD_LABELS[ticket.prioridad]}
          </span>
        </div>
      </div>

      {/* Título */}
      <Link href={`/tickets/${ticket.id}`} className="block mb-1.5">
        <p className={`line-clamp-2 text-sm font-semibold leading-snug hover:text-indigo-600 ${ticket.unread ? "text-slate-900" : "text-slate-700"}`}>
          {ticket.titulo}
        </p>
      </Link>

      {/* Empresa + Persona */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <p className="truncate text-[11px] text-slate-500">{persona}</p>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90"
          style={{ backgroundColor: companyColor }}
        >
          {ticket.empresaDestino.nombre.slice(0, 8)}
        </span>
      </div>

      {/* Banner BLOQUEADO */}
      {ticket.estado === "BLOQUEADO" && ticket.motivoBloqueo && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowMotivo(true); }}
          className="mb-2 flex w-full items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-left hover:bg-red-100 transition"
        >
          <Lock className="h-3 w-3 shrink-0 text-red-500" />
          <span className="truncate text-[10px] font-semibold text-red-600">Bloqueado · ver motivo</span>
        </button>
      )}

      {/* Pie: comentarios + asignado + enlace */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex shrink-0 items-center gap-1">
          {ticket._count.comentarios > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
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
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          title="Copiar enlace público"
          className="rounded p-1 text-slate-300 hover:bg-white/70 hover:text-slate-600 transition"
        >
          {linkCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
        </button>
      </div>

      {/* Botón → En curso */}
      {isAdmin && ticket.estado === "ABIERTO" && onTake ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTake(ticket.id); }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-500 hover:text-white hover:border-amber-500 active:scale-95"
        >
          <span>⚡</span> Coger ticket
        </button>
      ) : null}

      {ticket.motivoBloqueo && (
        <Dialog
          open={showMotivo}
          onClose={() => setShowMotivo(false)}
          title={`#${String(ticket.numero).padStart(4, "0")} · ${ticket.titulo}`}
          description={`Bloqueado ${formatDateTimeEs(ticket.updatedAt)}`}
        >
          <p className="whitespace-pre-wrap rounded-lg bg-red-50 border border-red-100 p-3 text-sm leading-relaxed text-red-700">
            {ticket.motivoBloqueo}
          </p>
        </Dialog>
      )}
    </Card>
  );
}
