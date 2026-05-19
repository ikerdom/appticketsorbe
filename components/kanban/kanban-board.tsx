"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Estado, Prioridad } from "@prisma/client";
import { ChevronDown, ChevronUp, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { SortableTicketCard } from "@/components/kanban/sortable-ticket-card";
import { ESTADO_LABELS } from "@/lib/constants";
import { formatDateTimeEs } from "@/lib/dates";
import type { TicketCardData } from "@/types/ticket";

interface KanbanBoardProps {
  initialTickets: TicketCardData[];
  empresas: { id: string; nombre: string; color: string | null; isActive: boolean }[];
  usuarios: { id: string; email: string; nombre: string | null; name: string | null; empresaId: string; image: string | null }[];
  isAdmin: boolean;
  currentUserId: string;
  currentUserEmpresaId: string;
}

const COLUMN_STYLES: Record<Estado, { header: string; dot: string; badge: string; dropzone: string }> = {
  ABIERTO: {
    header: "bg-blue-50 border-blue-100 text-blue-800",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
    dropzone: "bg-blue-50/40"
  },
  EN_CURSO: {
    header: "bg-amber-50 border-amber-100 text-amber-800",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    dropzone: "bg-amber-50/40"
  },
  RESUELTO: {
    header: "bg-emerald-50 border-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    dropzone: "bg-emerald-50/40"
  }
};
const HISTORICO_DIAS = 3;

function Column({ id, title, children, count }: { id: Estado; title: string; children: React.ReactNode; count: number }) {
  const { setNodeRef } = useDroppable({ id });
  const s = COLUMN_STYLES[id];

  return (
    <div className="space-y-2.5" role="region" aria-label={title}>
      <div className={`rounded-xl border px-4 py-2.5 ${s.header}`}>
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 rounded-full shadow-sm ${s.dot}`} />
          <span className="text-sm font-bold">{title}</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${s.badge}`}>{count}</span>
        </div>
      </div>

      <div ref={setNodeRef} className={`min-h-[240px] space-y-2 rounded-xl p-2 ${s.dropzone}`}>
        {count === 0 ? (
          <div className="rounded-lg border border-dashed border-current/20 p-6 text-center text-xs text-muted-foreground opacity-60">
            Sin incidencias
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

const CATEGORY_OPTIONS = ["Emails", "Seguridad", "Técnico", "Máquina", "Impresora", "Pedidos", "Presupuestos", "Otros"];

export function KanbanBoard({ initialTickets, empresas, isAdmin, currentUserId, currentUserEmpresaId }: KanbanBoardProps) {
  const [tickets, setTickets] = useState<TicketCardData[]>(initialTickets);
  const [activeTab, setActiveTab] = useState<Estado>("ABIERTO");
  const [showHistorico, setShowHistorico] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [filters, setFilters] = useState({
    empresaDestinoId: isAdmin ? "" : currentUserEmpresaId,
    prioridad: "",
    categoria: ""
  });

  const hasActiveFilters = useMemo(
    () => Boolean(filters.empresaDestinoId || filters.prioridad || filters.categoria),
    [filters]
  );

  const historicoResueltas = useMemo(() => {
    const cutoff = Date.now() - HISTORICO_DIAS * 24 * 60 * 60 * 1000;
    return tickets
      .filter((t) => t.estado === "RESUELTO" && new Date(t.resueltoAt ?? t.updatedAt).getTime() < cutoff)
      .sort((a, b) => new Date(b.resueltoAt ?? b.updatedAt).getTime() - new Date(a.resueltoAt ?? a.updatedAt).getTime());
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    const hiddenIds = new Set(historicoResueltas.map((t) => t.id));
    return tickets.filter((t) => !hiddenIds.has(t.id));
  }, [tickets, historicoResueltas]);

  const grouped = useMemo(
    () => ({
      ABIERTO: visibleTickets.filter((t) => t.estado === "ABIERTO"),
      EN_CURSO: visibleTickets.filter((t) => t.estado === "EN_CURSO"),
      RESUELTO: visibleTickets.filter((t) => t.estado === "RESUELTO")
    }),
    [visibleTickets]
  );

  async function refreshWithFilters(nextFilters = filters) {
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const response = await fetch(`/api/tickets?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setTickets(data.tickets);
  }

  function updateFilter(key: string, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (key === "vistaEmpresa") {
      window.localStorage.setItem("kanban-vista-empresa", value);
    }
    startTransition(() => {
      void refreshWithFilters(next);
    });
  }

  async function onDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;

    const ticketId = String(active.id);
    const fromTicket = tickets.find((t) => t.id === ticketId);
    if (!fromTicket) return;

    let targetEstado: Estado;
    if (over.id === "ABIERTO" || over.id === "EN_CURSO" || over.id === "RESUELTO") {
      targetEstado = over.id as Estado;
    } else {
      const overTicket = tickets.find((t) => t.id === String(over.id));
      if (!overTicket) return;
      targetEstado = overTicket.estado;
    }

    const canTakeByDrag = fromTicket.estado === "ABIERTO" && !fromTicket.asignadoId && targetEstado === "EN_CURSO";
    const canEditTicket = isAdmin || fromTicket.empresaOrigenId === currentUserEmpresaId || fromTicket.destinos.some((d) => d.empresaId === currentUserEmpresaId);
    if (!canEditTicket) {
      toast.error("Solo lectura: no puedes mover incidencias de otra empresa.");
      return;
    }
    if (!isAdmin && fromTicket.asignadoId && fromTicket.asignadoId !== currentUserId && !canTakeByDrag) {
      toast.error("Solo quien la está gestionando puede mover esta incidencia.");
      return;
    }

    if (targetEstado === fromTicket.estado) return;

    if (targetEstado === "RESUELTO") {
      const ok = window.confirm("¿Confirmas marcar esta incidencia como resuelta?");
      if (!ok) return;
    }

    const previous = tickets;
    const optimistic = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            estado: targetEstado,
            asignadoId: canTakeByDrag ? currentUserId : t.asignadoId
          }
        : t
    );
    setTickets(optimistic);

    const response = await fetch(`/api/tickets/${ticketId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: targetEstado })
    });

    if (!response.ok) {
      setTickets(previous);
      const body = await response.json().catch(() => ({ error: "No se pudo mover la incidencia" }));
      toast.error(body.error ?? "No se pudo mover la incidencia");
      return;
    }

    toast.success("Incidencia actualizada");
    await refreshWithFilters();
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-0 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Filtros</span>
            {visibleTickets.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {visibleTickets.length}
              </span>
            )}
          </div>
          <Link
            href="/tickets/nuevo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva incidencia
          </Link>
        </div>

        <div className="grid gap-2.5 md:grid-cols-3">
          <Select value={filters.empresaDestinoId} onChange={(e) => updateFilter("empresaDestinoId", e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </Select>

          <Select value={filters.prioridad} onChange={(e) => updateFilter("prioridad", e.target.value)}>
            <option value="">Cualquier prioridad</option>
            {Object.values(Prioridad).map((prioridad) => (
              <option key={prioridad} value={prioridad}>
                {prioridad}
              </option>
            ))}
          </Select>

          <Input list="categorias-options" value={filters.categoria} onChange={(e) => updateFilter("categoria", e.target.value)} placeholder="Filtrar por categoría…" />
          <datalist id="categorias-options">
            {CATEGORY_OPTIONS.map((categoria) => (
              <option key={categoria} value={categoria} />
            ))}
          </datalist>
        </div>

        {hasActiveFilters ? (
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => {
                const reset = {
                  empresaDestinoId: isAdmin ? "" : currentUserEmpresaId,
                  prioridad: "",
                  categoria: ""
                };
                setFilters(reset);
                startTransition(() => {
                  void refreshWithFilters(reset);
                });
              }}
            >
              × Limpiar filtros
            </button>
          </div>
        ) : null}

        {isPending && <p className="mt-2 text-xs text-muted-foreground">Actualizando…</p>}
      </Card>

      {visibleTickets.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center shadow-sm">
          <p className="mb-1 text-sm font-medium text-slate-600">Sin incidencias con estos filtros</p>
          <p className="mb-4 text-xs text-slate-400">Prueba a cambiar los filtros o crea una nueva</p>
          <Link href="/tickets/nuevo" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" />
            Crear incidencia
          </Link>
        </div>
      ) : null}

      {isAdmin && historicoResueltas.length > 0 ? (
        <Card className="rounded-xl border-0 bg-white p-3 shadow-sm ring-1 ring-slate-900/5">
          <button
            type="button"
            onClick={() => setShowHistorico((prev) => !prev)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-700"
          >
            <span>Histórico de resueltas · {historicoResueltas.length}</span>
            {showHistorico ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showHistorico ? (
            <div className="mt-3 space-y-1.5">
              {historicoResueltas.map((ticket) => {
                const empresa = ticket.destinos.find((d) => !d.empresa.isGlobalTarget)?.empresa ?? ticket.empresaDestino;
                const autor = ticket.creador.nombre || ticket.creador.name || ticket.creador.email;
                return (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block rounded-lg border bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: empresa.color || "#64748b" }}>
                        {empresa.nombre}
                      </span>
                      <span className="text-xs text-slate-400">
                        Resuelta: {formatDateTimeEs(ticket.resueltoAt ?? ticket.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      #{String(ticket.numero).padStart(4, "0")} · {ticket.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Por: {autor}</p>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </Card>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="hidden gap-4 md:grid md:grid-cols-3" role="list" aria-label="Kanban de incidencias">
          {(Object.keys(grouped) as Estado[]).map((estado) => (
            <Column key={estado} id={estado} title={ESTADO_LABELS[estado]} count={grouped[estado].length}>
              <SortableContext items={grouped[estado].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {grouped[estado].map((ticket) => (
                  <SortableTicketCard key={ticket.id} ticket={ticket} />
                ))}
              </SortableContext>
            </Column>
          ))}
        </div>

        <div className="md:hidden">
          <Tabs>
            <TabsList>
              {(Object.keys(grouped) as Estado[]).map((estado) => (
                <TabsTrigger key={estado} data-active={activeTab === estado} onClick={() => setActiveTab(estado)} type="button">
                  {ESTADO_LABELS[estado]} ({grouped[estado].length})
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent>
              <Column id={activeTab} title={ESTADO_LABELS[activeTab]} count={grouped[activeTab].length}>
                <SortableContext items={grouped[activeTab].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {grouped[activeTab].map((ticket) => (
                    <SortableTicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </SortableContext>
              </Column>
            </TabsContent>
          </Tabs>
        </div>
      </DndContext>
    </div>
  );
}
