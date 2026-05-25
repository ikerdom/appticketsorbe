"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  User,
  Building2,
  ChevronRight,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { formatDateTimeEs } from "@/lib/dates";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

type Estado = "ABIERTO" | "EN_CURSO";
type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";

export interface LiveTicket {
  id: string;
  numero: number;
  titulo: string;
  estado: Estado;
  prioridad: Prioridad;
  createdAt: string | Date;
  updatedAt: string | Date;
  asignadoId: string | null;
  empresaOrigen: { id: string; nombre: string; color: string | null };
  destinos: { empresa: { id: string; nombre: string; color: string | null; isGlobalTarget: boolean } }[];
  asignado: { id: string; nombre: string | null; name: string | null; email: string } | null;
  creador: { id: string; nombre: string | null; name: string | null; email: string };
}

interface LiveStats {
  total: number;
  abiertos: number;
  enCurso: number;
  criticos: number;
  sinAsignar: number;
  slaVencidos: number;
}

interface Props {
  initialTickets: LiveTicket[];
  initialStats: LiveStats;
  usuarios: { id: string; nombre: string | null; name: string | null; email: string }[];
  empresas: { id: string; nombre: string; color: string | null }[];
  currentUserId: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30; // seconds

const PRIORIDAD_CONFIG: Record<Prioridad, { label: string; color: string; ring: string }> = {
  BAJA:    { label: "BAJA",    color: "bg-slate-100 text-slate-600",   ring: "ring-slate-200" },
  MEDIA:   { label: "MEDIA",   color: "bg-blue-100 text-blue-700",     ring: "ring-blue-200" },
  ALTA:    { label: "ALTA",    color: "bg-orange-100 text-orange-700", ring: "ring-orange-200" },
  CRITICA: { label: "CRÍTICA", color: "bg-red-100 text-red-700",       ring: "ring-red-300" }
};

const ESTADO_CONFIG: Record<Estado, { label: string; color: string; icon: React.ReactNode }> = {
  ABIERTO:  { label: "Abierto",  color: "bg-slate-100 text-slate-600", icon: <Circle className="h-3 w-3" /> },
  EN_CURSO: { label: "En curso", color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> }
};

// ─── SLA helper ──────────────────────────────────────────────────────────────

function getSla(createdAt: string | Date) {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours < 4)  return { label: `${Math.round(hours * 60)}m`,          level: "ok"      as const };
  if (hours < 24) return { label: `${Math.round(hours)}h`,               level: "ok"      as const };
  if (hours < 48) return { label: `${Math.floor(hours / 24)}d`,          level: "warning" as const };
  if (hours < 72) return { label: `${Math.floor(hours / 24)}d`,          level: "danger"  as const };
  return           { label: `${Math.floor(hours / 24)}d ⚠`,              level: "critical"as const };
}

const SLA_STYLES: Record<string, string> = {
  ok:       "bg-emerald-100 text-emerald-700 ring-emerald-200",
  warning:  "bg-amber-100 text-amber-700 ring-amber-200",
  danger:   "bg-orange-100 text-orange-700 ring-orange-200",
  critical: "bg-red-100 text-red-700 ring-red-300 font-bold"
};

// ─── TicketRow ────────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  usuarios,
  onUpdate
}: {
  ticket: LiveTicket;
  usuarios: Props["usuarios"];
  onUpdate: (id: string, patch: Partial<LiveTicket>) => void;
}) {
  const [, startTransition] = useTransition();
  const sla = getSla(ticket.createdAt);
  const prioridadCfg = PRIORIDAD_CONFIG[ticket.prioridad];
  const estadoCfg = ESTADO_CONFIG[ticket.estado];
  const isCritica = ticket.prioridad === "CRITICA";
  const nombre = (u: LiveTicket["asignado"]) => u?.nombre || u?.name || u?.email || "—";

  function changeEstado(action: "take" | "resolve" | "reopen") {
    startTransition(async () => {
      const res = await fetch(`/api/tickets/${ticket.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) { toast.error("No se pudo actualizar"); return; }
      const data = await res.json();
      onUpdate(ticket.id, {
        estado: data.ticket.estado,
        asignadoId: data.ticket.asignadoId,
        updatedAt: data.ticket.updatedAt
      });
      toast.success(action === "resolve" ? "✓ Resuelta" : action === "take" ? "Tomada" : "Reabierta");
    });
  }

  const destEmpresa = ticket.destinos.find((d) => !d.empresa.isGlobalTarget)?.empresa;

  return (
    <tr
      className={`border-b border-slate-100 transition-colors hover:bg-slate-50/60 ${
        isCritica ? "bg-red-50/40" : ""
      }`}
    >
      {/* Nº */}
      <td className="whitespace-nowrap pl-4 pr-2 py-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          {isCritica && (
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
          #{String(ticket.numero).padStart(3, "0")}
        </div>
      </td>

      {/* Empresa */}
      <td className="px-2 py-3">
        <div className="flex flex-col gap-0.5">
          <span
            className="inline-flex max-w-[110px] items-center truncate rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: ticket.empresaOrigen.color || "#64748b" }}
          >
            {ticket.empresaOrigen.nombre}
          </span>
          {destEmpresa && destEmpresa.id !== ticket.empresaOrigen.id && (
            <span className="text-[10px] text-slate-400 pl-0.5">→ {destEmpresa.nombre}</span>
          )}
        </div>
      </td>

      {/* Titulo */}
      <td className="px-2 py-3 max-w-[220px]">
        <Link
          href={`/tickets/${ticket.id}`}
          className="text-sm font-medium text-slate-800 hover:text-indigo-600 hover:underline line-clamp-2 leading-snug"
        >
          {ticket.titulo}
        </Link>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {formatDateTimeEs(ticket.createdAt)} · por {nombre(ticket.creador)}
        </p>
      </td>

      {/* Prioridad */}
      <td className="px-2 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${prioridadCfg.color} ${prioridadCfg.ring}`}>
          {prioridadCfg.label}
        </span>
      </td>

      {/* SLA */}
      <td className="px-2 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ring-1 ${SLA_STYLES[sla.level]}`}>
          {sla.label}
        </span>
      </td>

      {/* Estado */}
      <td className="px-2 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${estadoCfg.color}`}>
          {estadoCfg.icon}
          {estadoCfg.label}
        </span>
      </td>

      {/* Asignado */}
      <td className="px-2 py-3 text-xs text-slate-500 max-w-[100px] truncate">
        {ticket.asignado ? (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 flex-shrink-0 text-slate-400" />
            <span className="truncate">{nombre(ticket.asignado)}</span>
          </span>
        ) : (
          <span className="text-orange-500 font-medium text-[10px]">Sin asignar</span>
        )}
      </td>

      {/* Acciones */}
      <td className="px-2 py-3 pr-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ticket.estado === "ABIERTO" && (
            <button
              type="button"
              onClick={() => changeEstado("take")}
              className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-700 transition"
            >
              Tomar
            </button>
          )}
          {ticket.estado === "EN_CURSO" && (
            <>
              <button
                type="button"
                onClick={() => changeEstado("reopen")}
                className="rounded-lg border px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition"
              >
                Reabrir
              </button>
              <button
                type="button"
                onClick={() => changeEstado("resolve")}
                className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600 transition"
              >
                ✓ Resolver
              </button>
            </>
          )}
          <Link
            href={`/tickets/${ticket.id}`}
            className="rounded-lg border px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition flex items-center gap-0.5"
          >
            Ver <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminLiveRoom({ initialTickets, initialStats, usuarios, empresas, currentUserId }: Props) {
  const [tickets, setTickets] = useState<LiveTicket[]>(initialTickets);
  const [stats, setStats] = useState<LiveStats>(initialStats);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [filterEmpresa, setFilterEmpresa] = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<string>("");
  const [filterPrioridad, setFilterPrioridad] = useState<string>("");
  const [newTicketAlert, setNewTicketAlert] = useState(false);

  const refresh = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/live");
      if (!res.ok) return;
      const data = await res.json();

      // Detect new tickets
      const prevIds = new Set(tickets.map((t) => t.id));
      const hasNew = data.tickets.some((t: LiveTicket) => !prevIds.has(t.id));
      if (hasNew && silent) {
        setNewTicketAlert(true);
        setTimeout(() => setNewTicketAlert(false), 5000);
        toast.info("🔔 Nuevo ticket recibido");
      }

      setTickets(data.tickets);
      setStats(data.stats);
      setLastUpdate(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch {
      // Silent fail on auto-refresh
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [tickets]);

  // Auto-refresh every REFRESH_INTERVAL seconds
  useEffect(() => {
    const id = setInterval(() => {
      refresh(true);
    }, REFRESH_INTERVAL * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function updateTicket(id: string, patch: Partial<LiveTicket>) {
    setTickets((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      // Remove resolved tickets from active list
      return updated.filter((t) => t.estado !== ("RESUELTO" as string));
    });
    // Recalculate stats
    setStats((prev) => {
      const updated = tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)).filter((t) => t.estado !== ("RESUELTO" as string));
      return {
        total: updated.length,
        abiertos: updated.filter((t) => t.estado === "ABIERTO").length,
        enCurso: updated.filter((t) => t.estado === "EN_CURSO").length,
        criticos: updated.filter((t) => t.prioridad === "CRITICA").length,
        sinAsignar: updated.filter((t) => !t.asignadoId).length,
        slaVencidos: updated.filter((t) => {
          const h = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
          return h > 72;
        }).length
      };
    });
  }

  // Filtered tickets
  const filtered = tickets.filter((t) => {
    if (filterEmpresa && t.empresaOrigen.id !== filterEmpresa) return false;
    if (filterEstado && t.estado !== filterEstado) return false;
    if (filterPrioridad && t.prioridad !== filterPrioridad) return false;
    return true;
  });

  const countdownPct = ((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sala de operaciones</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600 ring-1 ring-red-200">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              EN VIVO
            </span>
            {newTicketAlert && (
              <span className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 animate-bounce">
                🔔 Nuevo ticket
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Actualizado: {lastUpdate.toLocaleTimeString("es-ES")} · próximo en {countdown}s
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Countdown ring */}
          <div className="relative h-9 w-9">
            <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 15}`}
                strokeDashoffset={`${2 * Math.PI * 15 * (1 - countdownPct / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600">
              {countdown}s
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refresh(false)}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Link href="/" className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">
            ← Panel
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { label: "Activas", value: stats.total, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "Abiertas", value: stats.abiertos, color: "text-red-600", bg: "bg-red-50 border-red-100" },
          { label: "En curso", value: stats.enCurso, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "Críticas", value: stats.criticos, color: "text-red-700", bg: stats.criticos > 0 ? "bg-red-100 border-red-200" : "bg-slate-50 border-slate-200" },
          { label: "Sin asignar", value: stats.sinAsignar, color: "text-orange-600", bg: stats.sinAsignar > 0 ? "bg-orange-50 border-orange-100" : "bg-slate-50 border-slate-200" },
          { label: "SLA vencidas", value: stats.slaVencidos, color: "text-red-700", bg: stats.slaVencidos > 0 ? "bg-red-100 border-red-200" : "bg-slate-50 border-slate-200" }
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border px-3 py-2.5 text-center ${s.bg}`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-medium text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <select
          value={filterEmpresa}
          onChange={(e) => setFilterEmpresa(e.target.value)}
          className="h-8 rounded-lg border px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="h-8 rounded-lg border px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Todos los estados</option>
          <option value="ABIERTO">Abierto</option>
          <option value="EN_CURSO">En curso</option>
        </select>
        <select
          value={filterPrioridad}
          onChange={(e) => setFilterPrioridad(e.target.value)}
          className="h-8 rounded-lg border px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Todas las prioridades</option>
          <option value="CRITICA">Crítica</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </select>
        {(filterEmpresa || filterEstado || filterPrioridad) && (
          <button
            type="button"
            onClick={() => { setFilterEmpresa(""); setFilterEstado(""); setFilterPrioridad(""); }}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} de {tickets.length} tickets
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-16 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
          <p className="text-sm font-semibold text-slate-600">
            {tickets.length === 0 ? "No hay incidencias activas" : "No hay resultados con estos filtros"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {tickets.length === 0
              ? "¡Todo bajo control! El sistema actualiza cada 30 segundos."
              : "Prueba cambiando los filtros"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Ordenado por prioridad · antigüedad
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="pl-4 pr-2 py-2.5 text-left">#</th>
                  <th className="px-2 py-2.5 text-left">
                    <div className="flex items-center gap-1"><Building2 className="h-3 w-3" />Empresa</div>
                  </th>
                  <th className="px-2 py-2.5 text-left">Título</th>
                  <th className="px-2 py-2.5 text-left">Prioridad</th>
                  <th className="px-2 py-2.5 text-left">SLA</th>
                  <th className="px-2 py-2.5 text-left">Estado</th>
                  <th className="px-2 py-2.5 text-left">Asignado</th>
                  <th className="px-2 py-2.5 pr-4 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    usuarios={usuarios}
                    onUpdate={updateTicket}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* CRITICA legend */}
          {stats.criticos > 0 && (
            <div className="flex items-center gap-2 border-t bg-red-50 px-4 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-red-600 font-medium">
                {stats.criticos} incidencia{stats.criticos !== 1 ? "s" : ""} crítica{stats.criticos !== 1 ? "s" : ""} — requieren atención inmediata
              </span>
            </div>
          )}
        </div>
      )}

      {/* Dashboard link */}
      <div className="flex justify-center">
        <Link
          href="/admin/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-indigo-600 hover:underline"
        >
          Ver analytics completo →
        </Link>
      </div>
    </div>
  );
}
