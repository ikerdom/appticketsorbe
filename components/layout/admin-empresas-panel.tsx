"use client";

import Link from "next/link";
import {
  Plus, BarChart2, BookOpen, AlertTriangle,
  CheckCircle2, Clock, Ticket, ArrowRight
} from "lucide-react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { TicketCardData } from "@/types/ticket";

interface Props {
  empresas: { id: string; nombre: string; color: string | null; isActive: boolean }[];
  allTickets: (TicketCardData & { unread: boolean })[];
  usuarios: { id: string; email: string; nombre: string | null; name: string | null; empresaId: string; image: string | null }[];
  currentUserId: string;
  currentUserEmpresaId: string;
  totalTickets?: number;
}

export function AdminEmpresasPanel({
  empresas,
  allTickets,
  usuarios,
  currentUserId,
  currentUserEmpresaId,
}: Props) {
  const totalAbiertos  = allTickets.filter(t => t.estado === "ABIERTO").length;
  const totalEnCurso   = allTickets.filter(t => t.estado === "EN_CURSO").length;
  const totalQA        = allTickets.filter(t => t.estado === "QA").length;
  const totalResueltos = allTickets.filter(t => t.estado === "RESUELTO").length;
  const totalSinLeer   = allTickets.filter(t => t.unread).length;
  const totalActivos   = totalAbiertos + totalEnCurso + totalQA;

  const criticosAbiertos = allTickets.filter(t => t.prioridad === "CRITICA" && t.estado === "ABIERTO");

  return (
    <div className="space-y-5">

      {/* ── Stats grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <div className="relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
              <Ticket className="h-4 w-4 text-indigo-600" />
            </div>
            {totalSinLeer > 0 && (
              <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {totalSinLeer} sin leer
              </span>
            )}
          </div>
          <p className="text-3xl font-black tracking-tight text-slate-900">{totalActivos}</p>
          <p className="text-xs text-slate-400 mt-0.5">tickets activos</p>
          <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-indigo-50 opacity-60" />
        </div>

        <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-colors ${
          criticosAbiertos.length > 0 ? "bg-red-50 border-red-200" : "bg-white"
        }`}>
          <div className="mb-3 flex items-center justify-between">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              criticosAbiertos.length > 0 ? "bg-red-100" : "bg-slate-100"
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                criticosAbiertos.length > 0 ? "text-red-600" : "text-slate-400"
              }`} />
            </div>
          </div>
          <p className={`text-3xl font-black tracking-tight ${
            criticosAbiertos.length > 0 ? "text-red-600" : "text-slate-900"
          }`}>{criticosAbiertos.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">críticos abiertos</p>
          <div className={`absolute -right-3 -bottom-3 h-16 w-16 rounded-full opacity-40 ${
            criticosAbiertos.length > 0 ? "bg-red-100" : "bg-slate-50"
          }`} />
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-amber-50 border-amber-100 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-amber-700">{totalEnCurso}</p>
          <p className="text-xs text-amber-400 mt-0.5">en curso</p>
          <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-amber-100 opacity-60" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-emerald-50 border-emerald-100 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-emerald-700">{totalResueltos}</p>
          <p className="text-xs text-emerald-400 mt-0.5">resueltos</p>
          <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-emerald-100 opacity-60" />
        </div>
      </div>

      {/* ── Alerta tickets críticos ─────────────────────────────── */}
      {criticosAbiertos.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse shrink-0" />
            <span className="text-sm font-bold text-red-800">
              {criticosAbiertos.length} ticket{criticosAbiertos.length > 1 ? "s" : ""} crítico{criticosAbiertos.length > 1 ? "s" : ""} sin resolver
            </span>
          </div>
          <div className="space-y-1.5">
            {criticosAbiertos.slice(0, 4).map(t => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm hover:bg-white transition group"
              >
                <span className="font-mono text-[10px] font-bold text-red-400 shrink-0">
                  #{String(t.numero).padStart(4, "0")}
                </span>
                <span className="flex-1 truncate font-medium text-red-900">{t.titulo}</span>
                <ArrowRight className="h-3.5 w-3.5 text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
            {criticosAbiertos.length > 4 && (
              <p className="px-1 text-xs text-red-500">+{criticosAbiertos.length - 4} más…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Acciones rápidas ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/tickets/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva incidencia
        </Link>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
        >
          <BarChart2 className="h-4 w-4" />
          Analytics
        </Link>
        <Link
          href="/historico"
          className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
        >
          <BookOpen className="h-4 w-4" />
          Histórico
        </Link>
      </div>

      {/* ── Kanban (con su propio header + filtros) ──────────────── */}
      <KanbanBoard
        initialTickets={allTickets}
        empresas={empresas}
        usuarios={usuarios}
        isAdmin={true}
        currentUserId={currentUserId}
        currentUserEmpresaId={currentUserEmpresaId}
        initialEmpresaFilter=""
      />

    </div>
  );
}
