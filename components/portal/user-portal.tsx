"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Ticket, CheckSquare, Lightbulb, Clock, CheckCircle2,
  AlertCircle, Circle, MessageSquare, ChevronRight
} from "lucide-react";
import { formatRelativeEs } from "@/lib/dates";
import { TareasBoard } from "@/components/tareas/tareas-board";
import { PropuestasList } from "@/components/propuestas/propuestas-list";

type Tab = "incidencias" | "tareas" | "propuestas";

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

interface PortalPropuesta {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "PENDIENTE" | "REVISADA" | "ACEPTADA" | "DESCARTADA";
  autorNombre: string;
  autorEmail: string | null;
  notaAdmin: string | null;
  createdAt: Date | string;
  empresa: { id: string; nombre: string; color: string | null } | null;
}

interface UserPortalProps {
  tickets: PortalTicket[];
  tareas: PortalTarea[];
  propuestas: PortalPropuesta[];
  currentUserId: string;
  usuarios: { id: string; email: string; nombre: string | null; name: string | null }[];
  empresaNombre: string;
  autorNombre: string;
  autorEmail: string;
}

const ESTADO_TICKET: Record<TicketEstado, { label: string; icon: React.ReactNode; color: string }> = {
  ABIERTO: { label: "Abierto", icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-50" },
  EN_CURSO: { label: "En curso", icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50" },
  RESUELTO: { label: "Resuelto", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-600 bg-emerald-50" }
};

const PRIORIDAD_DOT: Record<Prioridad, string> = {
  BAJA: "bg-slate-300",
  MEDIA: "bg-blue-400",
  ALTA: "bg-orange-400",
  CRITICA: "bg-red-500"
};

export function UserPortal({
  tickets,
  tareas,
  propuestas,
  currentUserId,
  usuarios,
  empresaNombre,
  autorNombre,
  autorEmail
}: UserPortalProps) {
  const [tab, setTab] = useState<Tab>("incidencias");

  const abiertos = tickets.filter(t => t.estado === "ABIERTO").length;
  const enCurso = tickets.filter(t => t.estado === "EN_CURSO").length;
  const resueltos = tickets.filter(t => t.estado === "RESUELTO").length;
  const sinLeer = tickets.filter(t => t.unread).length;
  const tareasActivas = tareas.filter(t => t.estado !== "HECHO").length;
  const propuestasPendientes = propuestas.filter(p => p.estado === "PENDIENTE").length;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "incidencias", label: "Incidencias", icon: <Ticket className="h-4 w-4" />, badge: sinLeer || undefined },
    { id: "tareas", label: "Tareas", icon: <CheckSquare className="h-4 w-4" />, badge: tareasActivas || undefined },
    { id: "propuestas", label: "Propuestas", icon: <Lightbulb className="h-4 w-4" />, badge: propuestasPendientes || undefined }
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Abiertas" value={abiertos} color="text-red-600 bg-red-50 border-red-100" />
        <StatCard label="En curso" value={enCurso} color="text-amber-600 bg-amber-50 border-amber-100" />
        <StatCard label="Resueltas" value={resueltos} color="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <StatCard label="Sin leer" value={sinLeer} color="text-indigo-600 bg-indigo-50 border-indigo-100" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border bg-slate-50 p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "incidencias" && (
        <IncidenciasTab tickets={tickets} />
      )}
      {tab === "tareas" && (
        <TareasBoard
          initialTareas={tareas}
          isAdmin={false}
          currentUserId={currentUserId}
          usuarios={usuarios}
        />
      )}
      {tab === "propuestas" && (
        <PropuestasList
          initialPropuestas={propuestas}
          defaultAutorNombre={autorNombre}
          defaultAutorEmail={autorEmail}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-70">{label}</p>
    </div>
  );
}

function IncidenciasTab({ tickets }: { tickets: PortalTicket[] }) {
  const [showResueltos, setShowResueltos] = useState(false);

  const activos = tickets.filter(t => t.estado !== "RESUELTO");
  const resueltos = tickets.filter(t => t.estado === "RESUELTO");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">
          {activos.length} activa{activos.length !== 1 ? "s" : ""}
        </span>
        <Link
          href="/tickets/nuevo"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva incidencia
        </Link>
      </div>

      {activos.length === 0 && resueltos.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center shadow-sm">
          <Ticket className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="mb-1 text-sm font-medium text-slate-600">Sin incidencias activas</p>
          <p className="mb-4 text-xs text-slate-400">Crea una incidencia cuando lo necesites</p>
          <Link
            href="/tickets/nuevo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva incidencia
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {activos.map(t => <TicketRow key={t.id} ticket={t} />)}
        </div>
      )}

      {resueltos.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowResueltos(v => !v)}
            className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <span>✓ Resueltas · {resueltos.length}</span>
            <span className="text-xs text-slate-400">{showResueltos ? "Ocultar" : "Ver"}</span>
          </button>
          {showResueltos && (
            <div className="mt-2 space-y-2">
              {resueltos.map(t => <TicketRow key={t.id} ticket={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: PortalTicket }) {
  const cfg = ESTADO_TICKET[ticket.estado];
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition group"
    >
      {/* Unread dot */}
      <div className={`h-2 w-2 shrink-0 rounded-full ${ticket.unread ? "bg-indigo-500" : "bg-transparent"}`} />

      {/* Priority dot */}
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORIDAD_DOT[ticket.prioridad]}`} />

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${ticket.unread ? "text-slate-900" : "text-slate-700"}`}>
          {ticket.titulo}
        </p>
        <p className="text-[11px] text-slate-400">
          {ticket.empresaOrigen.nombre} · {formatRelativeEs(ticket.updatedAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {ticket._count.comentarios > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
            <MessageSquare className="h-3 w-3" />
            {ticket._count.comentarios}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
          {cfg.icon}{cfg.label}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition" />
      </div>
    </Link>
  );
}
