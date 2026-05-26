"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, AlertCircle, Clock, CheckCircle2,
  MessageSquare, ChevronRight, StickyNote
} from "lucide-react";
import { formatRelativeEs } from "@/lib/dates";
import { TareasBoard } from "@/components/tareas/tareas-board";

type Section = "internos" | null;

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

const ESTADO_TICKET: Record<TicketEstado, { label: string; icon: React.ReactNode; color: string }> = {
  ABIERTO:  { label: "Abierto",  icon: <AlertCircle className="h-3.5 w-3.5" />,  color: "text-red-500 bg-red-50" },
  EN_CURSO: { label: "En curso", icon: <Clock className="h-3.5 w-3.5" />,         color: "text-amber-600 bg-amber-50" },
  RESUELTO: { label: "Resuelto", icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "text-emerald-600 bg-emerald-50" }
};

const PRIORIDAD_DOT: Record<Prioridad, string> = {
  BAJA:    "bg-slate-300",
  MEDIA:   "bg-blue-400",
  ALTA:    "bg-orange-400",
  CRITICA: "bg-red-500 animate-pulse"
};

export function UserPortal({ tickets, tareas, currentUserId, usuarios }: UserPortalProps) {
  const [section, setSection] = useState<Section>(null);
  const [showResueltos, setShowResueltos] = useState(false);

  const activos    = tickets.filter(t => t.estado !== "RESUELTO");
  const resueltos  = tickets.filter(t => t.estado === "RESUELTO");
  const sinLeer    = tickets.filter(t => t.unread).length;
  const tareasAct  = tareas.filter(t => t.estado !== "HECHO").length;

  return (
    <div className="space-y-4">

      {/* Cabecera tickets + botón nuevo */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-700">Mis tickets</span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
            {activos.length} activos
          </span>
          {sinLeer > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {sinLeer} sin leer
            </span>
          )}
        </div>
        <Link
          href="/tickets/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo ticket
        </Link>
      </div>

      {/* Lista tickets activos */}
      {activos.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center shadow-sm">
          <p className="mb-1 text-sm font-medium text-slate-500">Sin tickets activos</p>
          <p className="mb-4 text-xs text-slate-400">Todo al día 👌</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {activos.map(t => <TicketRow key={t.id} ticket={t} />)}
        </div>
      )}

      {/* Resueltos colapsables */}
      {resueltos.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowResueltos(v => !v)}
            className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm hover:bg-slate-50 transition"
          >
            <span>✓ Resueltos · {resueltos.length}</span>
            <span className="text-xs text-slate-400">{showResueltos ? "Ocultar" : "Ver"}</span>
          </button>
          {showResueltos && (
            <div className="mt-1.5 space-y-1.5">
              {resueltos.map(t => <TicketRow key={t.id} ticket={t} />)}
            </div>
          )}
        </div>
      )}

      {/* Notas internas — discreta, al final */}
      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setSection(section === "internos" ? null : "internos")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <StickyNote className="h-3.5 w-3.5" />
          <span>Notas internas</span>
          {tareasAct > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{tareasAct}</span>
          )}
          <ChevronRight className={`ml-auto h-3.5 w-3.5 transition-transform ${section === "internos" ? "rotate-90" : ""}`} />
        </button>

        {section === "internos" && (
          <div className="mt-3">
            <TareasBoard
              initialTareas={tareas}
              isAdmin={false}
              currentUserId={currentUserId}
              usuarios={usuarios}
            />
          </div>
        )}
      </div>
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
      <div className={`h-2 w-2 shrink-0 rounded-full ${ticket.unread ? "bg-indigo-500" : "bg-transparent"}`} />
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORIDAD_DOT[ticket.prioridad]}`} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${ticket.unread ? "text-slate-900" : "text-slate-700"}`}>{ticket.titulo}</p>
        <p className="text-[11px] text-slate-400">{ticket.empresaOrigen.nombre} · {formatRelativeEs(ticket.updatedAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {ticket._count.comentarios > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
            <MessageSquare className="h-3 w-3" />{ticket._count.comentarios}
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
