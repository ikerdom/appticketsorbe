"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
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
}

export function AdminEmpresasPanel({ empresas, allTickets, empresasList, usuarios, currentUserId, currentUserEmpresaId }: Props) {
  const [showKanban, setShowKanban] = useState(true);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);

  const totalAbiertos = empresas.reduce((s, e) => s + e.abiertos, 0);
  const totalEnCurso = empresas.reduce((s, e) => s + e.enCurso, 0);
  const totalResueltos = empresas.reduce((s, e) => s + e.resueltos, 0);
  const totalSinLeer = allTickets.filter((t) => t.unread).length;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-red-50 border-red-100 px-4 py-3">
          <p className="text-2xl font-bold text-red-600">{totalAbiertos}</p>
          <p className="text-xs font-medium text-red-500/70">Abiertas</p>
        </div>
        <div className="rounded-xl border bg-amber-50 border-amber-100 px-4 py-3">
          <p className="text-2xl font-bold text-amber-600">{totalEnCurso}</p>
          <p className="text-xs font-medium text-amber-500/70">En curso</p>
        </div>
        <div className="rounded-xl border bg-emerald-50 border-emerald-100 px-4 py-3">
          <p className="text-2xl font-bold text-emerald-600">{totalResueltos}</p>
          <p className="text-xs font-medium text-emerald-500/70">Resueltas</p>
        </div>
        <div className="rounded-xl border bg-indigo-50 border-indigo-100 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-indigo-600">{totalSinLeer}</p>
            <p className="text-xs font-medium text-indigo-500/70">Sin leer</p>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/tickets/nuevo" className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 whitespace-nowrap">
              <Plus className="mr-0.5 inline h-3 w-3" />Nueva
            </Link>
            <Link href="/admin/dashboard" className="rounded-lg border px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap text-center">
              Dashboard
            </Link>
          </div>
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
                <p className="text-xl font-bold text-blue-600">{empresa.abiertos}</p>
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

      {/* Toggle kanban */}
      <button
        type="button"
        onClick={() => setShowKanban((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <span>
          {showKanban ? "Ocultar incidencias" : "Ver todas las incidencias"}
          {selectedEmpresaId ? ` · ${empresas.find((e) => e.id === selectedEmpresaId)?.nombre}` : " · todas las empresas"}
        </span>
        {showKanban ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {showKanban ? (
        <KanbanBoard
          initialTickets={allTickets}
          empresas={empresasList}
          usuarios={usuarios}
          isAdmin={true}
          currentUserId={currentUserId}
          currentUserEmpresaId={currentUserEmpresaId}
          initialEmpresaFilter={selectedEmpresaId ?? ""}
        />
      ) : null}
    </div>
  );
}
