"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Plus, Ticket, BarChart2, StickyNote, ChevronRight } from "lucide-react";
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

export function AdminEmpresasPanel({
  empresas,
  allTickets,
  empresasList,
  usuarios,
  currentUserId,
  currentUserEmpresaId,
  totalTickets = 0
}: Props) {
  const [showKanban, setShowKanban] = useState(true);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);

  const totalAbiertos = empresas.reduce((s, e) => s + e.abiertos, 0);
  const totalEnCurso = empresas.reduce((s, e) => s + e.enCurso, 0);
  const totalResueltos = empresas.reduce((s, e) => s + e.resueltos, 0);
  const totalSinLeer = allTickets.filter((t) => t.unread).length;
  const totalActivos = totalAbiertos + totalEnCurso;

  return (
    <div className="space-y-4">

      {/* Fila superior: métricas + acciones rápidas */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Stats chips */}
        <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
          <Ticket className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-800">{totalActivos}</span>
          <span className="text-xs text-slate-400">activos</span>
          {totalSinLeer > 0 && (
            <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{totalSinLeer}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-red-50 px-3 py-2 text-sm">
          <span className="font-bold text-red-600">{totalAbiertos}</span>
          <span className="text-xs text-red-400">abiertos</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-amber-50 px-3 py-2 text-sm">
          <span className="font-bold text-amber-600">{totalEnCurso}</span>
          <span className="text-xs text-amber-400">en curso</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-emerald-50 px-3 py-2 text-sm">
          <span className="font-bold text-emerald-600">{totalResueltos}</span>
          <span className="text-xs text-emerald-400">resueltos</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Acciones rápidas */}
        <Link
          href="/tickets/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo ticket
        </Link>

        {/* Notas internas — discreta */}
        <Link
          href="/tareas"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
        >
          <StickyNote className="h-3.5 w-3.5" />
          Mis notas
          {totalTickets > 0 && (
            <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{totalTickets}</span>
          )}
        </Link>

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Analytics
        </Link>
      </div>

      {/* Cards de empresa — grid 2x2 o 4 cols */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {empresas.map((empresa) => (
          <button
            key={empresa.id}
            type="button"
            onClick={() => {
              setSelectedEmpresaId(empresa.id === selectedEmpresaId ? null : empresa.id);
              setShowKanban(true);
            }}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md ${
              selectedEmpresaId === empresa.id ? "ring-2 ring-indigo-400 border-indigo-200" : "hover:border-slate-300"
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: empresa.color || "#64748b" }} />
              <span className="truncate text-sm font-semibold text-slate-800">{empresa.nombre}</span>
              {selectedEmpresaId === empresa.id && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-indigo-400 rotate-90" />
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <p className="text-lg font-bold text-red-500">{empresa.abiertos}</p>
                <p className="text-[10px] text-slate-400">Abiert.</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-500">{empresa.enCurso}</p>
                <p className="text-[10px] text-slate-400">Curso</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-500">{empresa.resueltos}</p>
                <p className="text-[10px] text-slate-400">Resuel.</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Kanban toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowKanban((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
        >
          <span>
            {selectedEmpresaId
              ? `Kanban · ${empresas.find((e) => e.id === selectedEmpresaId)?.nombre}`
              : "Kanban · todas las empresas"}
          </span>
          <div className="flex items-center gap-2">
            {selectedEmpresaId && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedEmpresaId(null); }}
                className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-100"
              >
                Ver todas
              </button>
            )}
            {showKanban ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </button>

        {showKanban && (
          <div className="mt-2">
            <KanbanBoard
              initialTickets={allTickets}
              empresas={empresasList}
              usuarios={usuarios}
              isAdmin={true}
              currentUserId={currentUserId}
              currentUserEmpresaId={currentUserEmpresaId}
              initialEmpresaFilter={selectedEmpresaId ?? ""}
            />
          </div>
        )}
      </div>
    </div>
  );
}
