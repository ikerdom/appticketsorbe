"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Plus, Ticket, CheckSquare, BarChart2, ChevronRight } from "lucide-react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { TicketCardData } from "@/types/ticket";

interface EmpresaStat {
  id: string;
  nombre: string;
  color: string | null;
  abiertos: number;
  enCurso: number;
  resueltos: number;
  total: number;
}

interface Props {
  empresas: EmpresaStat[];
  allTickets: (TicketCardData & { unread: boolean })[];
  empresasList: { id: string; nombre: string; color: string | null; isActive: boolean }[];
  usuarios: { id: string; email: string; nombre: string | null; name: string | null; empresaId: string; image: string | null }[];
  currentUserId: string;
  currentUserEmpresaId: string;
  totalTickets?: number;
}

type Section = "incidencias" | null;

export function AdminEmpresasPanel({
  empresas,
  allTickets,
  empresasList,
  usuarios,
  currentUserId,
  currentUserEmpresaId,
  totalTickets = 0
}: Props) {
  const [showKanban, setShowKanban] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>(null);

  const totalAbiertos = empresas.reduce((s, e) => s + e.abiertos, 0);
  const totalEnCurso = empresas.reduce((s, e) => s + e.enCurso, 0);
  const totalResueltos = empresas.reduce((s, e) => s + e.resueltos, 0);
  const totalSinLeer = allTickets.filter((t) => t.unread).length;
  const totalIncActivas = totalAbiertos + totalEnCurso;

  const bigCards = [
    {
      id: "incidencias" as const,
      icon: <Ticket className="h-6 w-6" />,
      label: "Tickets",
      main: totalIncActivas,
      mainLabel: totalIncActivas === 1 ? "activo" : "activos",
      sub: totalSinLeer > 0 ? `${totalSinLeer} sin leer` : "Todo al día",
      gradient: "from-indigo-500 to-indigo-600",
      border: "border-indigo-200",
      iconBg: "bg-indigo-100 text-indigo-600",
      action: "Nuevo ticket",
      actionHref: "/tickets/nuevo"
    },
    {
      id: null,
      icon: <CheckSquare className="h-6 w-6" />,
      label: "Tickets internos",
      main: totalTickets,
      mainLabel: totalTickets === 1 ? "activo" : "activos",
      sub: "Gestión interna del equipo",
      gradient: "from-amber-500 to-orange-500",
      border: "border-amber-200",
      iconBg: "bg-amber-100 text-amber-600",
      action: "Ver tickets internos",
      actionHref: "/tareas"
    }
  ];

  return (
    <div className="space-y-6">
      {/* 3 big cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {bigCards.map((card, i) => {
          const active = card.id !== null && section === card.id;
          const isClickable = card.id !== null;
          return (
            <div key={i} className="flex flex-col">
              <button
                type="button"
                onClick={() => {
                  if (card.id !== null) {
                    setSection(active ? null : card.id);
                    if (card.id === "incidencias") setShowKanban(!active);
                  }
                }}
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
                  <span>{isClickable ? (active ? "Cerrar" : "Ver") : "Ir a"} {card.label.toLowerCase()}</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${active ? "rotate-90" : ""}`} />
                </div>
              </button>

              {/* Action link */}
              <Link
                href={card.actionHref}
                className={`mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${card.gradient} px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition`}
              >
                <Plus className="h-4 w-4" />
                {card.action}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Tickets detail: company cards + kanban */}
      {section === "incidencias" && (
        <div className="space-y-4">
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border bg-red-50 border-red-100 px-3 py-2.5 text-center">
              <p className="text-xl font-bold text-red-600">{totalAbiertos}</p>
              <p className="text-[11px] font-medium text-red-400">Abiertas</p>
            </div>
            <div className="rounded-xl border bg-amber-50 border-amber-100 px-3 py-2.5 text-center">
              <p className="text-xl font-bold text-amber-600">{totalEnCurso}</p>
              <p className="text-[11px] font-medium text-amber-400">En curso</p>
            </div>
            <div className="rounded-xl border bg-emerald-50 border-emerald-100 px-3 py-2.5 text-center">
              <p className="text-xl font-bold text-emerald-600">{totalResueltos}</p>
              <p className="text-[11px] font-medium text-emerald-400">Resueltas</p>
            </div>
          </div>

          {/* Company cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {empresas.map((empresa) => (
              <button
                key={empresa.id}
                type="button"
                onClick={() => {
                  setSelectedEmpresaId(empresa.id === selectedEmpresaId ? null : empresa.id);
                  setShowKanban(true);
                }}
                className={`rounded-xl border bg-white p-4 text-left shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md ${
                  selectedEmpresaId === empresa.id ? "ring-2 ring-indigo-400" : ""
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: empresa.color || "#64748b" }} />
                  <span className="truncate text-sm font-semibold text-slate-800">{empresa.nombre}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                  <div>
                    <p className="text-xl font-bold text-red-600">{empresa.abiertos}</p>
                    <p className="text-slate-400">Abiertos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600">{empresa.enCurso}</p>
                    <p className="text-slate-400">En curso</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{empresa.resueltos}</p>
                    <p className="text-slate-400">Resueltos</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Kanban toggle */}
          <button
            type="button"
            onClick={() => setShowKanban((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span>
              {showKanban ? "Ocultar kanban" : "Ver kanban"}
              {selectedEmpresaId ? ` · ${empresas.find((e) => e.id === selectedEmpresaId)?.nombre}` : " · todas las empresas"}
            </span>
            {showKanban ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showKanban && (
            <KanbanBoard
              initialTickets={allTickets}
              empresas={empresasList}
              usuarios={usuarios}
              isAdmin={true}
              currentUserId={currentUserId}
              currentUserEmpresaId={currentUserEmpresaId}
              initialEmpresaFilter={selectedEmpresaId ?? ""}
            />
          )}

          {/* Live room link */}
          <Link
            href="/admin/live"
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 shadow-sm hover:bg-red-100 transition"
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            🔴 Sala de operaciones (live)
          </Link>

          {/* Dashboard link */}
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <BarChart2 className="h-4 w-4" />
            Ver analytics completo →
          </Link>
        </div>
      )}
    </div>
  );
}
