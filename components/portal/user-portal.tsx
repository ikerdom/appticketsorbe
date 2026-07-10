"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle, AlertTriangle, ArrowRight, CheckCircle2,
  ChevronDown, ChevronRight, ChevronUp, Clock, Lock, MessageSquare, Plus
} from "lucide-react";
import { formatDateTimeEs, formatRelativeEs } from "@/lib/dates";
import { Dialog } from "@/components/ui/dialog";

type TicketEstado = "ABIERTO" | "EN_CURSO" | "BLOQUEADO" | "RESUELTO";
type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";

interface PortalTicket {
  id: string;
  numero: number;
  titulo: string;
  estado: TicketEstado;
  prioridad: Prioridad;
  updatedAt: Date | string;
  unread: boolean;
  motivoBloqueo?: string | null;
  empresaOrigen: { nombre: string; color: string | null };
  creador: { nombre: string | null; name: string | null; email: string };
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

const COL_CONFIG: Record<TicketEstado, {
  label: string;
  icon: React.ReactNode;
  header: string;
  dot: string;
  badge: string;
  bg: string;
}> = {
  ABIERTO: {
    label: "Abiertos",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    header: "bg-red-50 border-red-100 text-red-800",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
    bg: "bg-red-50/30"
  },
  EN_CURSO: {
    label: "En curso",
    icon: <Clock className="h-3.5 w-3.5" />,
    header: "bg-amber-50 border-amber-100 text-amber-800",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    bg: "bg-amber-50/30"
  },
  BLOQUEADO: {
    label: "Bloqueados",
    icon: <Lock className="h-3.5 w-3.5" />,
    header: "bg-red-50 border-red-100 text-red-800",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
    bg: "bg-red-50/30"
  },
  RESUELTO: {
    label: "Resueltos",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    header: "bg-emerald-50 border-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    bg: "bg-emerald-50/30"
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

export function UserPortal({ tickets }: UserPortalProps) {
  const [showResueltos, setShowResueltos] = useState(false);

  const abiertos   = tickets.filter(t => t.estado === "ABIERTO");
  const enCurso    = tickets.filter(t => t.estado === "EN_CURSO");
  const bloqueados = tickets.filter(t => t.estado === "BLOQUEADO");
  const resueltos  = tickets.filter(t => t.estado === "RESUELTO");
  const sinLeer    = tickets.filter(t => t.unread).length;
  const activos    = abiertos.length + enCurso.length + bloqueados.length;

  const criticosAbiertos = abiertos.filter(t => t.prioridad === "CRITICA");

  return (
    <div className="space-y-5">

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100">
            <AlertCircle className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-black tracking-tight text-slate-900">{activos}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            activos
            {sinLeer > 0 && <span className="ml-1.5 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{sinLeer}</span>}
          </p>
          <div className="absolute -right-3 -bottom-3 h-14 w-14 rounded-full bg-indigo-50" />
        </div>

        <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${abiertos.length > 0 ? "bg-red-50 border-red-100" : "bg-white"}`}>
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-red-100">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className={`text-3xl font-black tracking-tight ${abiertos.length > 0 ? "text-red-600" : "text-slate-900"}`}>{abiertos.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">abiertos</p>
          <div className="absolute -right-3 -bottom-3 h-14 w-14 rounded-full bg-red-100 opacity-40" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-amber-50 border-amber-100 p-4 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black tracking-tight text-amber-700">{enCurso.length}</p>
          <p className="text-xs text-amber-400 mt-0.5">en curso</p>
          <div className="absolute -right-3 -bottom-3 h-14 w-14 rounded-full bg-amber-100 opacity-60" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-emerald-50 border-emerald-100 p-4 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black tracking-tight text-emerald-700">{resueltos.length}</p>
          <p className="text-xs text-emerald-400 mt-0.5">resueltos</p>
          <div className="absolute -right-3 -bottom-3 h-14 w-14 rounded-full bg-emerald-100 opacity-60" />
        </div>
      </div>

      {/* ── Alerta críticos ─────────────────────────────────────── */}
      {criticosAbiertos.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse shrink-0" />
            <span className="text-sm font-bold text-red-800">
              {criticosAbiertos.length} incidencia{criticosAbiertos.length > 1 ? "s" : ""} crítica{criticosAbiertos.length > 1 ? "s" : ""} pendiente{criticosAbiertos.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1.5">
            {criticosAbiertos.map(t => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm hover:bg-white transition group"
              >
                <span className="flex-1 truncate font-medium text-red-900">{t.titulo}</span>
                <ArrowRight className="h-3.5 w-3.5 text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Acción + cabecera incidencias ───────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-800">
          Mis incidencias
          {activos > 0 && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{activos} activas</span>}
        </h2>
        <Link
          href="/tickets/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva
        </Link>
      </div>

      {/* ── Columnas de tickets ──────────────────────────────────── */}
      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-700">Todo al día</p>
          <p className="mb-5 text-sm text-slate-400">Sin incidencias pendientes. ¡Buen trabajo!</p>
          <Link
            href="/tickets/nuevo"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" /> Crear incidencia
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop: 4 cols */}
          <div className="hidden gap-3 md:grid md:grid-cols-4">
            <KanbanCol estado="ABIERTO"  tickets={abiertos} />
            <KanbanCol estado="EN_CURSO" tickets={enCurso} />
            <KanbanCol estado="BLOQUEADO" tickets={bloqueados} />
            {/* Resueltos colapsables */}
            <div className="space-y-2">
              <ColHeader estado="RESUELTO" count={resueltos.length} />
              {resueltos.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowResueltos(v => !v)}
                    className="flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition"
                  >
                    <span>{showResueltos ? "Ocultar resueltos" : `Ver ${resueltos.length} resueltos`}</span>
                    {showResueltos ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {showResueltos && (
                    <div className="space-y-1.5">
                      {resueltos.map(t => <TicketCard key={t.id} ticket={t} />)}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-400 bg-emerald-50/30">Sin resueltos</div>
              )}
            </div>
          </div>

          {/* Mobile: lista */}
          <div className="space-y-3 md:hidden">
            {(["ABIERTO", "EN_CURSO", "BLOQUEADO", "RESUELTO"] as TicketEstado[]).map(estado => (
              <KanbanCol
                key={estado}
                estado={estado}
                tickets={
                  estado === "ABIERTO" ? abiertos
                  : estado === "EN_CURSO" ? enCurso
                  : estado === "BLOQUEADO" ? bloqueados
                  : resueltos
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ColHeader({ estado, count }: { estado: TicketEstado; count: number }) {
  const cfg = COL_CONFIG[estado];
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
  const cfg = COL_CONFIG[estado];
  return (
    <div className="space-y-2">
      <ColHeader estado={estado} count={tickets.length} />
      <div className={`min-h-[120px] space-y-1.5 rounded-xl p-2 ${cfg.bg}`}>
        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-400 opacity-60">
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
  const [showMotivo, setShowMotivo] = useState(false);
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block rounded-xl border bg-white px-3.5 py-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition group"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {ticket.unread && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" title="Sin leer" />}
          <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORIDAD_DOT[ticket.prioridad]}`} />
          <span className="text-[10px] font-semibold text-slate-400">{PRIORIDAD_LABEL[ticket.prioridad] ?? ticket.prioridad}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {ticket._count.comentarios > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <MessageSquare className="h-3 w-3" />
              {ticket._count.comentarios}
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition" />
        </div>
      </div>
      <p className={`line-clamp-2 text-sm font-semibold leading-snug ${ticket.unread ? "text-slate-900" : "text-slate-700"}`}>
        {ticket.titulo}
      </p>
      {ticket.estado === "BLOQUEADO" && ticket.motivoBloqueo && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMotivo(true); }}
          className="mt-1.5 flex w-full items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-left hover:bg-red-100 transition"
        >
          <Lock className="h-3 w-3 shrink-0 text-red-500" />
          <span className="truncate text-[11px] font-semibold text-red-600">Bloqueado · ver motivo</span>
        </button>
      )}
      <p className="mt-1 text-[10px] text-slate-400">
        {formatRelativeEs(ticket.updatedAt)}
      </p>

      {ticket.motivoBloqueo && (
        // stopPropagation: el Dialog vive dentro del <Link> de la card — sin esto,
        // cerrar el popup (X, backdrop) dispararía también la navegación al ticket
        <div onClick={(e) => e.stopPropagation()}>
          <Dialog
            open={showMotivo}
            onClose={() => setShowMotivo(false)}
            title={`#${String(ticket.numero).padStart(4, "0")} · ${ticket.titulo}`}
            description={`Bloqueado ${formatDateTimeEs(ticket.updatedAt)}`}
          >
            <p className="whitespace-pre-wrap rounded-lg border border-red-100 bg-red-50 p-3 text-sm leading-relaxed text-red-700">
              {ticket.motivoBloqueo}
            </p>
          </Dialog>
        </div>
      )}
    </Link>
  );
}
