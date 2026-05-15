"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Estado, Prioridad } from "@prisma/client";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { SortableTicketCard } from "@/components/kanban/sortable-ticket-card";
import { ESTADO_LABELS } from "@/lib/constants";
import type { TicketCardData } from "@/types/ticket";

interface KanbanBoardProps {
  initialTickets: TicketCardData[];
  empresas: { id: string; nombre: string; color: string | null; isActive: boolean }[];
  usuarios: { id: string; email: string; nombre: string | null; name: string | null; empresaId: string; image: string | null }[];
  isAdmin: boolean;
  currentUserId: string;
}

const COLUMN_BAR: Record<Estado, string> = {
  ABIERTO: "bg-blue-500",
  EN_CURSO: "bg-amber-500",
  RESUELTO: "bg-emerald-500"
};

function Column({ id, title, children, count }: { id: Estado; title: string; children: React.ReactNode; count: number }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="space-y-3" role="region" aria-label={title}>
      <div className="rounded-2xl border bg-card p-3">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span>
            {title} · {count}
          </span>
        </div>
        <div className={`h-1.5 rounded-full ${COLUMN_BAR[id]}`} />
      </div>

      <div ref={setNodeRef} className="min-h-[320px] space-y-3 rounded-2xl border bg-muted/20 p-3">
        {count === 0 ? (
          <div className="rounded-xl border border-dashed bg-background/80 p-4 text-center text-sm text-muted-foreground">
            Nada por aquí.
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function KanbanBoard({ initialTickets, empresas, isAdmin, currentUserId }: KanbanBoardProps) {
  const [tickets, setTickets] = useState<TicketCardData[]>(initialTickets);
  const [activeTab, setActiveTab] = useState<Estado>("ABIERTO");
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [filters, setFilters] = useState({
    q: "",
    empresaDestinoId: "",
    prioridad: "",
    categoria: "",
    vistaEmpresa: isAdmin ? "all" : "mine"
  });

  const hasActiveFilters = useMemo(
    () =>
      Boolean(filters.q || filters.empresaDestinoId || filters.prioridad || filters.categoria || (isAdmin && filters.vistaEmpresa !== "all")),
    [filters, isAdmin]
  );

  useEffect(() => {
    if (!isAdmin) return;
    const persisted = window.localStorage.getItem("kanban-vista-empresa");
    if (persisted === "all" || persisted === "mine") {
      setFilters((prev) => ({ ...prev, vistaEmpresa: persisted }));
      void refreshWithFilters({ ...filters, vistaEmpresa: persisted });
      return;
    }
    window.localStorage.setItem("kanban-vista-empresa", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const grouped = useMemo(
    () => ({
      ABIERTO: tickets.filter((t) => t.estado === "ABIERTO"),
      EN_CURSO: tickets.filter((t) => t.estado === "EN_CURSO"),
      RESUELTO: tickets.filter((t) => t.estado === "RESUELTO")
    }),
    [tickets]
  );

  const byDestino = useMemo(() => {
    return empresas.map((empresa) => {
      const list = tickets.filter((ticket) => ticket.destinos.some((destino) => destino.empresaId === empresa.id));
      return { empresa, list };
    });
  }, [empresas, tickets]);

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
      <Card className="rounded-2xl p-4 shadow-sm">
        {isAdmin ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
            <div className="inline-flex rounded-lg border bg-background p-1">
              <button
                type="button"
                onClick={() => updateFilter("vistaEmpresa", "all")}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  filters.vistaEmpresa === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Todas las empresas
              </button>
              <button
                type="button"
                onClick={() => updateFilter("vistaEmpresa", "mine")}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  filters.vistaEmpresa === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Solo mi empresa
              </button>
            </div>
            <p className="text-sm font-medium">Mostrando {tickets.length} incidencias</p>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar incidencia" value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} />
          </div>

          <Select value={filters.empresaDestinoId} onChange={(e) => updateFilter("empresaDestinoId", e.target.value)}>
            <option value="">Empresa afectada</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </Select>

          <Select value={filters.prioridad} onChange={(e) => updateFilter("prioridad", e.target.value)}>
            <option value="">Prioridad</option>
            {Object.values(Prioridad).map((prioridad) => (
              <option key={prioridad} value={prioridad}>
                {prioridad}
              </option>
            ))}
          </Select>

          <Input value={filters.categoria} onChange={(e) => updateFilter("categoria", e.target.value)} placeholder="Categoría" />
        </div>

        {hasActiveFilters ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
              onClick={() => {
                const reset = {
                  q: "",
                  empresaDestinoId: "",
                  prioridad: "",
                  categoria: "",
                  vistaEmpresa: isAdmin ? "all" : "mine"
                };
                setFilters(reset);
                startTransition(() => {
                  void refreshWithFilters(reset);
                });
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}

        {isPending && <p className="mt-3 text-xs text-muted-foreground">Actualizando filtros...</p>}
      </Card>

      <Card className="rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-semibold">Incidencias por empresa afectada</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {byDestino.map(({ empresa, list }) => (
            <div key={empresa.id} className="rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{empresa.nombre}</span>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </div>
              {list.length === 0 ? <p className="text-xs text-muted-foreground">Ninguna</p> : null}
              <div className="space-y-1">
                {list.slice(0, 3).map((ticket) => (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block truncate text-xs text-slate-700 hover:underline">
                    #{String(ticket.numero).padStart(3, "0")} · {ticket.titulo}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">No hay incidencias con los filtros actuales.</p>
          <Link href="/tickets/nuevo" className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Crear incidencia
          </Link>
        </div>
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
