"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DndContext, PointerSensor, closestCenter, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Estado, Prioridad } from "@prisma/client";
import { ChevronDown, ChevronUp, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  initialEmpresaFilter?: string;
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
  BLOQUEADO: {
    header: "bg-red-50 border-red-100 text-red-800",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
    dropzone: "bg-red-50/40"
  },
  RESUELTO: {
    header: "bg-emerald-50 border-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    dropzone: "bg-emerald-50/40"
  }
};
const HISTORICO_DIAS = 1;

function Column({ id, title, children, count, isDragOver }: { id: Estado; title: string; children: React.ReactNode; count: number; isDragOver?: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  const s = COLUMN_STYLES[id];

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2.5 rounded-2xl p-2 transition-colors ${isDragOver ? "bg-slate-100 ring-2 ring-indigo-300 ring-offset-1" : ""}`}
      role="region"
      aria-label={title}
    >
      <div className={`rounded-xl border px-4 py-2.5 ${s.header}`}>
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 rounded-full shadow-sm ${s.dot}`} />
          <span className="text-sm font-bold">{title}</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${s.badge}`}>{count}</span>
        </div>
      </div>

      <div className={`min-h-[240px] space-y-2 rounded-xl p-2 ${s.dropzone}`}>
        {count === 0 ? (
          <div className="rounded-lg border border-dashed border-current/20 p-6 text-center text-xs text-muted-foreground opacity-60">
            Suelta aquí
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

const CATEGORY_OPTIONS = ["Emails", "Seguridad", "Técnico", "Máquina", "Impresora", "Pedidos", "Presupuestos", "Otros"];

export function KanbanBoard({ initialTickets, empresas, isAdmin, currentUserId, currentUserEmpresaId, initialEmpresaFilter }: KanbanBoardProps) {
  // Full list of tickets — only replaced after DnD state changes
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketCardData[]>(initialTickets);
  const [activeTab, setActiveTab] = useState<Estado>("ABIERTO");
  const [showHistorico, setShowHistorico] = useState(false);
  const [draggingOver, setDraggingOver] = useState<Estado | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ ticketId: string; targetEstado: Estado; previous: TicketCardData[] } | null>(null);
  const [notaResolucion, setNotaResolucion] = useState("");
  const [blockPending, setBlockPending] = useState<{ ticketId: string; previous: TicketCardData[] } | null>(null);
  const [motivoBloqueo, setMotivoBloqueo] = useState("");

  // Client-side filters — no API call on change
  const [filters, setFilters] = useState({
    empresaId: initialEmpresaFilter ?? "",
    prioridad: "",
    categoria: ""
  });

  // Sync empresa filter when parent (AdminEmpresasPanel) changes selected company
  const prevEmpresaFilter = useRef(initialEmpresaFilter);
  useEffect(() => {
    if (initialEmpresaFilter !== prevEmpresaFilter.current) {
      prevEmpresaFilter.current = initialEmpresaFilter;
      setFilters(prev => ({ ...prev, empresaId: initialEmpresaFilter ?? "" }));
    }
  }, [initialEmpresaFilter]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Custom collision: prefer column droppables (pointer-within), fall back to closestCenter
  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    // If pointer is within a column droppable, use that
    const columnHit = pointerHits.find((c) => c.id === "ABIERTO" || c.id === "EN_CURSO" || c.id === "BLOQUEADO" || c.id === "RESUELTO");
    if (columnHit) return [columnHit];
    // Otherwise fall back to closestCenter (works for ticket-over-ticket reorder)
    return closestCenter(args);
  };

  function getTargetEstado(overId: string): Estado | null {
    if (overId === "ABIERTO" || overId === "EN_CURSO" || overId === "BLOQUEADO" || overId === "RESUELTO") return overId as Estado;
    const overTicket = tickets.find((t) => t.id === overId);
    return overTicket?.estado ?? null;
  }

  const hasActiveFilters = useMemo(
    () => Boolean(filters.empresaId || filters.prioridad || filters.categoria),
    [filters]
  );

  // Historico: resolved tickets older than HISTORICO_DIAS — always from full list
  const historicoResueltas = useMemo(() => {
    const cutoff = Date.now() - HISTORICO_DIAS * 24 * 60 * 60 * 1000;
    return tickets
      .filter((t) => t.estado === "RESUELTO" && new Date(t.resueltoAt ?? t.updatedAt).getTime() < cutoff)
      .sort((a, b) => new Date(b.resueltoAt ?? b.updatedAt).getTime() - new Date(a.resueltoAt ?? a.updatedAt).getTime());
  }, [tickets]);

  const historicoIds = useMemo(() => new Set(historicoResueltas.map((t) => t.id)), [historicoResueltas]);

  // Client-side filtered tickets (empresa, prioridad, categoria + hide historico)
  const visibleTickets = useMemo(() => {
    const cutoff = Date.now() - HISTORICO_DIAS * 24 * 60 * 60 * 1000;
    return tickets.filter((t) => {
      // Hide old resolved tickets (they go to historico section)
      if (t.estado === "RESUELTO" && new Date(t.resueltoAt ?? t.updatedAt).getTime() < cutoff) {
        return false;
      }
      // Empresa filter — solo por empresa afectada (destino), no por quien creó el ticket
      if (filters.empresaId) {
        const match =
          t.empresaDestinoId === filters.empresaId ||
          t.destinos.some((d) => d.empresaId === filters.empresaId);
        if (!match) return false;
      }
      // Prioridad filter
      if (filters.prioridad && t.prioridad !== filters.prioridad) return false;
      // Categoria filter
      if (filters.categoria) {
        const cat = ((t.categoriaCustom ?? "") || t.categoria || "").toLowerCase();
        if (!cat.includes(filters.categoria.toLowerCase())) return false;
      }
      return true;
    });
  }, [tickets, filters]);

  const grouped = useMemo(
    () => ({
      ABIERTO: visibleTickets.filter((t) => t.estado === "ABIERTO"),
      EN_CURSO: visibleTickets.filter((t) => t.estado === "EN_CURSO"),
      BLOQUEADO: visibleTickets.filter((t) => t.estado === "BLOQUEADO"),
      RESUELTO: visibleTickets.filter((t) => t.estado === "RESUELTO")
    }),
    [visibleTickets]
  );

  const isMine = (t: TicketCardData) =>
    t.empresaOrigenId === currentUserEmpresaId || t.destinos.some((d) => d.empresaId === currentUserEmpresaId);

  const split = (list: TicketCardData[]) =>
    isAdmin
      ? { mine: list, others: [] as TicketCardData[] }
      : { mine: list.filter(isMine), others: list.filter((t) => !isMine(t)) };

  const groupedSplit = useMemo(
    () => ({
      ABIERTO: split(grouped.ABIERTO),
      EN_CURSO: split(grouped.EN_CURSO),
      BLOQUEADO: split(grouped.BLOQUEADO),
      RESUELTO: split(grouped.RESUELTO)
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grouped, currentUserEmpresaId, isAdmin]
  );

  // Re-runs the Server Component via Next.js App Router — fresh Prisma query,
  // no read-after-write race on Neon, React state is preserved during the refresh.
  const scheduleSync = useCallback(() => {
    setTimeout(() => router.refresh(), 800);
  }, [router]);

  async function handleTake(ticketId: string) {
    const previous = tickets;
    const now = new Date();
    setTickets(tickets.map((t) =>
      t.id === ticketId ? { ...t, estado: "EN_CURSO" as const, asignadoId: currentUserId, updatedAt: now } : t
    ));
    const response = await fetch(`/api/tickets/${ticketId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "take" })
    });
    if (!response.ok) {
      setTickets(previous);
      const body = await response.json().catch(() => ({ error: "No se pudo marcar en curso" }));
      toast.error(body.error ?? "No se pudo marcar en curso");
      return;
    }
    toast.success("Ticket marcado en curso");
    scheduleSync();
  }

  function onDragMove(event: any) {
    const { over } = event;
    if (!over) { setDraggingOver(null); return; }
    setDraggingOver(getTargetEstado(String(over.id)));
  }

  async function onDragEnd(event: any) {
    setDraggingOver(null);
    const { active, over } = event;
    if (!over) return;

    const ticketId = String(active.id);
    const fromTicket = tickets.find((t) => t.id === ticketId);
    if (!fromTicket) return;

    const targetEstado = getTargetEstado(String(over.id));
    if (!targetEstado) return;

    const canTakeByDrag = fromTicket.estado === "ABIERTO" && !fromTicket.asignadoId && targetEstado === "EN_CURSO";
    const isCreator = fromTicket.creadorId === currentUserId;
    const canEditTicket = isAdmin || isCreator || fromTicket.empresaOrigenId === currentUserEmpresaId || fromTicket.destinos.some((d) => d.empresaId === currentUserEmpresaId);
    if (!canEditTicket) {
      toast.error("Solo lectura: no puedes mover tickets de otra empresa.");
      return;
    }
    if (!isAdmin && !isCreator && fromTicket.asignadoId && fromTicket.asignadoId !== currentUserId && !canTakeByDrag) {
      toast.error("Solo quien la está gestionando puede mover este ticket.");
      return;
    }

    if (targetEstado === fromTicket.estado) return;

    const previous = tickets;
    const now = new Date();

    if (targetEstado === "BLOQUEADO") {
      // Optimistic update first so the card moves visually
      setTickets(tickets.map((t) =>
        t.id === ticketId ? { ...t, estado: "BLOQUEADO" as const, updatedAt: now } : t
      ));
      setMotivoBloqueo("");
      setBlockPending({ ticketId, previous });
      return;
    }

    if (targetEstado === "RESUELTO") {
      // Optimistic update first so the card moves visually
      setTickets(tickets.map((t) =>
        t.id === ticketId ? { ...t, estado: targetEstado, resueltoAt: now, updatedAt: now } : t
      ));
      // Then ask for confirmation via dialog (nota de resolución obligatoria)
      setNotaResolucion("");
      setConfirmPending({ ticketId, targetEstado, previous });
      return;
    }

    // Non-RESUELTO moves: proceed directly with optimistic update
    setTickets(tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            estado: targetEstado,
            asignadoId: canTakeByDrag ? currentUserId : t.asignadoId,
            resueltoAt: targetEstado === "ABIERTO" ? null : t.resueltoAt,
            updatedAt: now
          }
        : t
    ));

    const response = await fetch(`/api/tickets/${ticketId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: targetEstado })
    });

    if (!response.ok) {
      setTickets(previous);
      const body = await response.json().catch(() => ({ error: "No se pudo mover el ticket" }));
      toast.error(body.error ?? "No se pudo mover el ticket");
      return;
    }

    toast.success("Ticket actualizado");
    scheduleSync();
  }

  const confirmResolve = useCallback(async () => {
    if (!confirmPending) return;
    if (!notaResolucion.trim()) return; // botón disabled, por seguridad

    const { ticketId, previous } = confirmPending;
    setConfirmPending(null);

    const response = await fetch(`/api/tickets/${ticketId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", notaResolucion: notaResolucion.trim() })
    });

    if (!response.ok) {
      setTickets(previous);
      const body = await response.json().catch(() => ({ error: "No se pudo resolver el ticket" }));
      toast.error(body.error ?? "No se pudo resolver el ticket");
      return;
    }

    toast.success("Ticket marcado como resuelto");
    scheduleSync();
  }, [confirmPending, notaResolucion, scheduleSync]);

  const cancelResolve = useCallback(() => {
    if (!confirmPending) return;
    setTickets(confirmPending.previous);
    setConfirmPending(null);
  }, [confirmPending]);

  const confirmBlock = useCallback(async () => {
    if (!blockPending) return;
    if (!motivoBloqueo.trim()) return; // botón disabled, por seguridad

    const { ticketId, previous } = blockPending;
    setBlockPending(null);

    const response = await fetch(`/api/tickets/${ticketId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "BLOQUEADO", motivoBloqueo: motivoBloqueo.trim() })
    });

    if (!response.ok) {
      setTickets(previous);
      const body = await response.json().catch(() => ({ error: "No se pudo bloquear el ticket" }));
      toast.error(body.error ?? "No se pudo bloquear el ticket");
      return;
    }

    toast.success("Ticket marcado como bloqueado");
    scheduleSync();
  }, [blockPending, motivoBloqueo, scheduleSync]);

  const cancelBlock = useCallback(() => {
    if (!blockPending) return;
    setTickets(blockPending.previous);
    setBlockPending(null);
    setMotivoBloqueo("");
  }, [blockPending]);

  return (
    <div className="space-y-4">
      <Dialog
        open={confirmPending !== null}
        onClose={cancelResolve}
        title="¿Marcar como resuelto?"
        description="Añade una nota explicando cómo se resolvió. El creador la recibirá como respuesta."
      >
        <Textarea
          value={notaResolucion}
          onChange={(e) => setNotaResolucion(e.target.value)}
          placeholder="Ej: Se actualizó el permiso del usuario. Se reinició el servicio y verificamos que funciona correctamente..."
          rows={3}
          autoFocus
          className="mb-3"
        />
        <DialogActions>
          <Button type="button" variant="outline" onClick={cancelResolve}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!notaResolucion.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            onClick={confirmResolve}
          >
            Marcar resuelto
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={blockPending !== null}
        onClose={cancelBlock}
        title="¿Bloquear este ticket?"
        description="Indica el motivo del bloqueo. Será visible para el creador del ticket."
      >
        <Textarea
          value={motivoBloqueo}
          onChange={(e) => setMotivoBloqueo(e.target.value)}
          placeholder="Ej: La web está en mantenimiento hasta el lunes. Pendiente de que el proveedor responda..."
          rows={3}
          autoFocus
          className="mb-3"
        />
        <DialogActions>
          <Button type="button" variant="outline" onClick={cancelBlock}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!motivoBloqueo.trim()}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            onClick={confirmBlock}
          >
            Bloquear ticket
          </Button>
        </DialogActions>
      </Dialog>
      <Card className="rounded-xl border-0 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="font-medium">Filtros</span>
          {visibleTickets.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {visibleTickets.length}
            </span>
          )}
        </div>

        <div className="grid gap-2.5 md:grid-cols-3">
          <Select
            value={filters.empresaId}
            onChange={(e) => setFilters(prev => ({ ...prev, empresaId: e.target.value }))}
          >
            <option value="">{isAdmin ? "Todas las empresas" : "Todos mis tickets"}</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </Select>

          <Select
            value={filters.prioridad}
            onChange={(e) => setFilters(prev => ({ ...prev, prioridad: e.target.value }))}
          >
            <option value="">Cualquier prioridad</option>
            {Object.values(Prioridad).map((prioridad) => (
              <option key={prioridad} value={prioridad}>
                {prioridad}
              </option>
            ))}
          </Select>

          <Input
            list="categorias-options"
            value={filters.categoria}
            onChange={(e) => setFilters(prev => ({ ...prev, categoria: e.target.value }))}
            placeholder="Filtrar por categoría…"
          />
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
              onClick={() => setFilters({ empresaId: "", prioridad: "", categoria: "" })}
            >
              × Limpiar filtros
            </button>
          </div>
        ) : null}

      </Card>

      {visibleTickets.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center shadow-sm">
          <p className="mb-1 text-sm font-medium text-slate-600">
            {hasActiveFilters ? "Sin tickets con estos filtros" : "Sin tickets activos"}
          </p>
          <p className="mb-4 text-xs text-slate-400">
            {hasActiveFilters ? "Prueba a cambiar los filtros o crea un nuevo ticket" : "Todo al día 👌"}
          </p>
          <Link href="/tickets/nuevo" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" />
            Nuevo ticket
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
            <span>Histórico de resueltos · {historicoResueltas.length}</span>
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
                        Resuelto: {formatDateTimeEs(ticket.resueltoAt ?? ticket.updatedAt)}
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

      <DndContext id="kanban-board" sensors={sensors} collisionDetection={collisionDetection} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={() => setDraggingOver(null)}>
        <div className="hidden gap-4 md:grid md:grid-cols-4" role="list" aria-label="Kanban de tickets">
          {(Object.keys(grouped) as Estado[]).map((estado) => {
            const { mine, others } = groupedSplit[estado];
            const all = grouped[estado];
            return (
              <Column key={estado} id={estado} title={ESTADO_LABELS[estado]} count={all.length} isDragOver={draggingOver === estado}>
                <SortableContext items={all.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {mine.map((ticket) => (
                    <SortableTicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onTake={handleTake} />
                  ))}
                  {others.length > 0 && mine.length > 0 ? (
                    <div className="pointer-events-none py-1 text-center text-[11px] text-slate-400">
                      ── otras empresas ──
                    </div>
                  ) : null}
                  {others.map((ticket) => (
                    <SortableTicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onTake={handleTake} />
                  ))}
                </SortableContext>
              </Column>
            );
          })}
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
              {(() => {
                const { mine, others } = groupedSplit[activeTab];
                const all = grouped[activeTab];
                return (
                  <Column id={activeTab} title={ESTADO_LABELS[activeTab]} count={all.length} isDragOver={draggingOver === activeTab}>
                    <SortableContext items={all.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      {mine.map((ticket) => (
                        <SortableTicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onTake={handleTake} />
                      ))}
                      {others.length > 0 && mine.length > 0 ? (
                        <div className="pointer-events-none py-1 text-center text-[11px] text-slate-400">
                          ── otras empresas ──
                        </div>
                      ) : null}
                      {others.map((ticket) => (
                        <SortableTicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} onTake={handleTake} />
                      ))}
                    </SortableContext>
                  </Column>
                );
              })()}
            </TabsContent>
          </Tabs>
        </div>
      </DndContext>
    </div>
  );
}
