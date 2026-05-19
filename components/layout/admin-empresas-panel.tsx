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

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-600">{totalAbiertos}</span>
          <span className="text-xs text-slate-500">abiertas</span>
        </div>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-amber-600">{totalEnCurso}</span>
          <span className="text-xs text-slate-500">en curso</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/admin/dashboard" className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Dashboard →
          </Link>
          <Link href="/tickets/nuevo" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
            <Plus className="mr-1 inline h-3 w-3" />
            Nueva
          </Link>
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
