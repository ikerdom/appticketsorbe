"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Clock, MessageSquare, Plus
} from "lucide-react";
import { formatRelativeEs } from "@/lib/dates";

type TicketEstado = "ABIERTO" | "EN_CURSO" | "RESUELTO";
type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";

interface PortalTicket {
  id: string;
  titulo: string;
  estado: TicketEstado;
  prioridad: Prioridad;
  updatedAt: Date | string;
  unread: boolean;
  empresaOrigen: { nombre: string; color: string | null };
  _count: { comentarios: number };
}

interface PortalTarea {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string | null;
  estado: "PENDIENTE" | "EN_CURSO" | "HECHO";
  prioridad: Prioridad;
  empresaId: string;
  creadorId: string;
  asignadoId: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  resueltoAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  empresa: { id: string; nombre: string; color: string | null };
  creador: { id: string; email: string; nombre: string | null; name: string | null };
  asignado: { id: string; email: string; nombre: string | null; name: string | null } | null;
}

interface UserPortalProps {
  tickets: PortalTicket[];
  tareas: PortalTarea[];
  propuestas: unknown[];
  currentUserId: string;
  usuarios: { id: string; email: string; nombre: string | null; name: string | null }[];
  autorNombre: string;
  autorEmail: string;
}

const ESTADO_CONFIG: Record<TicketEstado, {
  label: string;
  icon: React.ReactNode;
  header: string;
  dot: string;
  badge: string;
  dropzone: string;
}> = {
  ABIERTO: {
    label: "Abiertos",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    header: "bg-red-50 border-red-100 text-red-800",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
    dropzone: "bg-red-50/30"
  },
  EN_CURSO: {
    label: "En curso",
    icon: <Clock className="h-3.5 w-3.5" />,
    header: "bg-amber-50 border-amber-100 text-amber-800",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    dropzone: "bg-amber-50/30"
  },
  RESUELTO: {
    label: "Resueltos",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    header: "bg-emerald-50 border-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    dropzone: "bg-emerald-50/30"
  }
};

const PRIORIDAD_DOT: Record<Prioridad, string> = {
  BAJA:    "bg-slate-300",
  MEDIA:   "bg-blue-400",
  ALTA:    "bg-orange-400",
  CRITICA: "bg-red-500 animate-pulse"
};

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja"
};

export function UserPortal({ tickets, tareas, currentUserId, usuarios }: UserPortalProps) {
  const [showResueltos, setShowResueltos] = useState(false);

  const abiertos  = tickets.filter(t => t.estado === "ABIERTO");
  const enCurso   = tickets.filter(t => t.estado === "EN_CURSO");
  const resueltos = tickets.filter(t => t.estado === "RESUELTO");
  const sinLeer   = tickets.filter(t => t.unread).length;
  const tareasAct = tareas.filter(t => t.estado !== "HECHO").length;
  const activos   = abiertos.length + enCurso.length;

  return (
    <div className="space-y-4">

      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
          <span className="text-sm font-bold text-slate-800">{activos}</span>
          <span className="text-xs text-slate-400">activos</span>
          {sinLeer > 0 && (
            <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{sinLeer}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-red-50 px-3 py-2 text-sm">
          <span className="font-bold text-red-600">{abiertos.length}</span>
          <span className="text-xs text-red-400">abiertos</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-amber-50 px-3 py-2 text-sm">
          <span className="font-bold text-amber-600">{enCurso.length}</span>
          <span className="text-xs text-amber-400">en curso</span>
        </div>
        <div className="flex-1" />
        <Link
          href="/tickets/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo ticket
        </Link>
      </div>

      {/* Kanban 3 columnas — desktop */}
      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center shadow-sm">
          <p className="mb-1 text-sm font-medium text-slate-500">Sin tickets activos</p>
          <p className="text-xs text-slate-400">Todo al día 👌</p>
        </div>
      ) : (
        <>
          {/* Desktop: 3 cols (resueltos ocultos por defecto) */}
          <div className="hidden gap-3 md:grid md:grid-cols-3">
            {(["ABIERTO", "EN_CURSO"] as TicketEstado[]).map(estado => (
              <KanbanCol key={estado} estado={estado} tickets={estado === "ABIERTO" ? abiertos : enCurso} />
            ))}
            {/* Resueltos colapsables en desktop */}
            <div className="space-y-2">
              <KanbanColHeader estado="RESUELTO" count={resueltos.length} />
              {resueltos.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowResueltos(v => !v)}
                    className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    <span>{showResueltos ? "Ocultar" : "Ver resueltos"}</span>
                    {showResueltos ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {showResueltos && (
                    <div className="space-y-1.5">
                      {resueltos.map(t => <TicketCard key={t.id} ticket={t} />)}
                    </div>
                  )}
                </>
              )}
              {resueltos.length === 0 && (
                <div className="rounded-xl border border-dashed p-5 text-center text-xs text-slate-400 bg-emerald-50/30">Sin resueltos</div>
              )}
            </div>
          </div>

          {/* Mobile: lista por estado */}
          <div className="space-y-3 md:hidden">
            {(["ABIERTO", "EN_CURSO", "RESUELTO"] as TicketEstado[]).map(estado => {
              const list = estado === "ABIERTO" ? abiertos : estado === "EN_CURSO" ? enCurso : resueltos;
              return <KanbanCol key={estado} estado={estado} tickets={list} />;
            })}
          </div>
        </>
      )}

    </div>
  );
}

function KanbanColHeader({ estado, count }: { estado: TicketEstado; count: number }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <div className={`rounded-xl border px-4 py-2.5 ${cfg.header}`}>
      <div className="flex items-center gap-2.5">
        <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        <span className="text-sm font-bold">{cfg.label}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${cfg.badge}`}>{count}</span>
      </div>
    </div>
  );
}

function KanbanCol({ estado, tickets }: { estado: TicketEstado; tickets: PortalTicket[] }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <div className="space-y-2">
      <KanbanColHeader estado={estado} count={tickets.length} />
      <div className={`min-h-[160px] space-y-1.5 rounded-xl p-2 ${cfg.dropzone}`}>
        {tickets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-current/20 p-5 text-center text-xs text-slate-400 opacity-60">
            Sin tickets
          </div>
        ) : (
          tickets.map(t => <TicketCard key={t.id} ticket={t} />)
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: PortalTicket }) {
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block rounded-xl border bg-white px-3.5 py-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition group"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {ticket.unread && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
          <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORIDAD_DOT[ticket.prioridad]}`} />
          <span className="text-[10px] font-semibold text-slate-400">{PRIORIDAD_LABEL[ticket.prioridad]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {ticket._count.comentarios > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <MessageSquare className="h-3 w-3" />{ticket._count.comentarios}
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition" />
        </div>
      </div>
      <p className={`line-clamp-2 text-sm font-semibold leading-snug ${ticket.unread ? "text-slate-900" : "text-slate-700"}`}>
        {ticket.titulo}
      </p>
      <p className="mt-1 text-[10px] text-slate-400">{formatRelativeEs(ticket.updatedAt)}</p>
    </Link>
  );
}
