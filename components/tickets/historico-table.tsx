"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { BookOpen, RotateCcw, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { formatDateTimeEs } from "@/lib/dates";
import { ticketCode } from "@/lib/ticket-utils";

interface HistoricoItem {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  prioridad: string;
  categoria: string;
  categoriaCustom: string | null;
  estado: string;
  notaResolucion: string | null;
  horasDedicadas: number | null;
  empresaDestino: { nombre: string };
  creador: { email: string; nombre: string | null; name: string | null };
  resueltoAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-blue-100 text-blue-700",
  ALTA: "bg-orange-100 text-orange-800",
  CRITICA: "bg-red-100 text-red-700"
};

function HistoricoRow({ ticket, onReopen }: { ticket: HistoricoItem; onReopen: (id: string) => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const creadorName = ticket.creador.nombre || ticket.creador.name || ticket.creador.email;
  const cat = ticket.categoriaCustom || ticket.categoria;
  const tieneSolucion = Boolean(ticket.notaResolucion?.trim());

  return (
    <>
      <tr className="border-t hover:bg-slate-50 transition-colors">
        <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{ticketCode(ticket.empresaDestino.nombre, ticket.numero)}</td>
        <td className="px-3 py-2.5">
          <p className="font-medium text-slate-800 leading-snug">{ticket.titulo}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{ticket.descripcion}</p>
        </td>
        <td className="px-3 py-2.5 text-sm text-slate-600">{ticket.empresaDestino.nombre}</td>
        <td className="px-3 py-2.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORIDAD_COLOR[ticket.prioridad] ?? ""}`}>
            {ticket.prioridad}
          </span>
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-500">{cat}</td>
        <td className="px-3 py-2.5 text-xs text-slate-500">{creadorName}</td>
        <td className="px-3 py-2.5 text-xs text-slate-500">{formatDateTimeEs(ticket.resueltoAt || ticket.updatedAt)}</td>
        <td className="px-3 py-2.5">
          {tieneSolucion ? (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            >
              <BookOpen className="h-3 w-3" />
              Solución
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          ) : (
            <span className="text-[11px] text-slate-300">Sin documenter</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => router.push(`/tickets/${ticket.id}`)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReopen(ticket.id)}
              title="Reabrir ticket"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Nota resolución expandida */}
      {expanded && tieneSolucion && (
        <tr className="border-t bg-emerald-50">
          <td colSpan={9} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-700">Cómo se resolvió</p>
                <p className="whitespace-pre-wrap text-sm text-emerald-900 leading-relaxed">{ticket.notaResolucion}</p>
                {ticket.horasDedicadas != null && (
                  <p className="mt-1.5 text-xs text-emerald-600">⏱ Tiempo dedicado: {ticket.horasDedicadas}h</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function HistoricoTable({ items }: { items: HistoricoItem[] }) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const [reopenId, setReopenId] = useState<string | null>(null);

  function reopen(ticketId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticketId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_estado", estado: "EN_CURSO" })
      });
      if (!response.ok) {
        toast.error("No se pudo reabrir el ticket.");
        return;
      }
      toast.success("Ticket reabierto.");
      router.refresh();
    });
  }

  const conSolucion = items.filter(t => t.notaResolucion?.trim()).length;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No hay tickets que coincidan con los filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{items.length} tickets</span>
        {conSolucion > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {conSolucion} con solución documentada
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">ID</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Título</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Empresa</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Prioridad</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Categoría</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Creador</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Cerrado el</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Solución</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((ticket) => (
              <HistoricoRow key={ticket.id} ticket={ticket} onReopen={setReopenId} />
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={reopenId !== null}
        onClose={() => setReopenId(null)}
        title="Reabrir ticket"
        description="El ticket volverá al kanban en estado En curso. ¿Continuar?"
      >
        <DialogActions>
          <Button variant="outline" onClick={() => setReopenId(null)}>Cancelar</Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => {
              const id = reopenId;
              setReopenId(null);
              if (id) reopen(id);
            }}
          >
            Reabrir
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
