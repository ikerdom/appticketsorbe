"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, AlertCircle, Clock, CheckCircle2,
  MessageSquare, ChevronRight, Ticket, CheckSquare
} from "lucide-react";
import { formatRelativeEs } from "@/lib/dates";
import { TareasBoard } from "@/components/tareas/tareas-board";

type Section = "tickets" | "internos" | null;

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
  propuestas: unknown[]; // kept for prop compat, not used
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
  CRITICA: "bg-red-500"
};

export function UserPortal({ tickets, tareas, currentUserId, usuarios }: UserPortalProps) {
  const [section, setSection] = useState<Section>(null);

  const activos    = tickets.filter(t => t.estado !== "RESUELTO").length;
  const sinLeer    = tickets.filter(t => t.unread).length;
  const tareasAct  = tareas.filter(t => t.estado !== "HECHO").length;
  const tareasEnCurso = tareas.filter(t => t.estado === "EN_CURSO").length;

  const cards: {
    id: Section;
    icon: React.ReactNode;
    label: string;
    main: number;
    mainLabel: string;
    sub: string;
    gradient: string;
    border: string;
    iconBg: string;
    action?: string;
    actionHref?: string;
  }[] = [
    {
      id: "tickets",
      icon: <Ticket className="h-6 w-6" />,
      label: "Tickets",
      main: activos,
      mainLabel: activos === 1 ? "activo" : "activos",
      sub: sinLeer > 0 ? `${sinLeer} sin leer` : "Todo al día",
      gradient: "from-indigo-500 to-indigo-600",
      border: "border-indigo-200",
      iconBg: "bg-indigo-100 text-indigo-600",
      action: "Nuevo ticket",
      actionHref: "/tickets/nuevo"
    },
    {
      id: "internos",
      icon: <CheckSquare className="h-6 w-6" />,
      label: "Tickets internos",
      main: tareasAct,
      mainLabel: tareasAct === 1 ? "activo" : "activos",
      sub: tareasEnCurso > 0 ? `${tareasEnCurso} en curso` : "Sin tickets en curso",
      gradient: "from-amber-500 to-orange-500",
      border: "border-amber-200",
      iconBg: "bg-amber-100 text-amber-600"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Cards nav */}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(card => {
          const active = section === card.id;
          return (
            <div key={card.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => setSection(active ? null : card.id)}
                className={`group relative overflow-hidden rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition-all hover:shadow-lg ${
                  active ? `${card.border} shadow-md` : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
                    {card.icon}
                  </div>
                  {active && (
                    <span className={`rounded-full bg-gradient-to-r ${card.gradient} px-2.5 py-0.5 text-[11px] font-bold text-white`}>
                      Abierto
                    </span>
                  )}
                </div>
                <p className={`text-4xl font-extrabold tracking-tight bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                  {card.main}
                </p>
                <p className="text-sm font-semibold text-slate-700">{card.mainLabel} · {card.label}</p>
                <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition">
                  <span>{active ? "Cerrar" : "Ver"} {card.label.toLowerCase()}</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${active ? "rotate-90" : ""}`} />
                </div>
              </button>

              {card.actionHref && (
                <Link
                  href={card.actionHref}
                  className={`mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${card.gradient} px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition`}
                >
                  <Plus className="h-4 w-4" />
                  {card.action}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Section content */}
      {section === "tickets"  && <TicketsSection tickets={tickets} />}
      {section === "internos" && (
        <TareasBoard
          initialTareas={tareas}
          isAdmin={false}
          currentUserId={currentUserId}
          usuarios={usuarios}
        />
      )}
    </div>
  );
}

function TicketsSection({ tickets }: { tickets: PortalTicket[] }) {
  const [showResueltos, setShowResueltos] = useState(false);
  const activos   = tickets.filter(t => t.estado !== "RESUELTO");
  const resueltos = tickets.filter(t => t.estado === "RESUELTO");

  return (
    <div className="space-y-3">
      {activos.length === 0 && resueltos.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center shadow-sm">
          <Ticket className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="mb-1 text-sm font-medium text-slate-600">Sin tickets activos</p>
          <p className="mb-4 text-xs text-slate-400">Crea un ticket cuando lo necesites</p>
          <Link href="/tickets/nuevo" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            <Plus className="h-3.5 w-3.5" /> Nuevo ticket
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
            <span>✓ Resueltos · {resueltos.length}</span>
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
