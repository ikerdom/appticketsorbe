"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Lightbulb, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import { formatDateTimeEs } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PropuestaEstado = "PENDIENTE" | "REVISADA" | "ACEPTADA" | "DESCARTADA";

interface Propuesta {
  id: string;
  titulo: string;
  descripcion: string;
  estado: PropuestaEstado;
  autorNombre: string;
  autorEmail: string | null;
  notaAdmin: string | null;
  createdAt: Date | string;
  empresa: { id: string; nombre: string; color: string | null } | null;
  user: { id: string; email: string; nombre: string | null; name: string | null } | null;
}

const ESTADO_CONFIG: Record<PropuestaEstado, { label: string; icon: React.ReactNode; color: string }> = {
  PENDIENTE: { label: "Pendiente", icon: <Clock className="h-3.5 w-3.5" />, color: "bg-slate-100 text-slate-600" },
  REVISADA: { label: "Revisada", icon: <Eye className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-700" },
  ACEPTADA: { label: "Aceptada", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-emerald-100 text-emerald-700" },
  DESCARTADA: { label: "Descartada", icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-600" }
};

const ESTADOS: PropuestaEstado[] = ["PENDIENTE", "REVISADA", "ACEPTADA", "DESCARTADA"];

function PropuestaAdminCard({
  propuesta,
  onUpdate,
  onDelete
}: {
  propuesta: Propuesta;
  onUpdate: (id: string, data: Partial<Propuesta>) => void;
  onDelete: (id: string) => void;
}) {
  const [, startTransition] = useTransition();
  const [editNota, setEditNota] = useState(false);
  const [nota, setNota] = useState(propuesta.notaAdmin ?? "");
  const cfg = ESTADO_CONFIG[propuesta.estado];

  function changeEstado(estado: PropuestaEstado) {
    startTransition(async () => {
      const res = await fetch(`/api/propuestas/${propuesta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado })
      });
      if (!res.ok) { toast.error("No se pudo actualizar"); return; }
      const { propuesta: updated } = await res.json();
      onUpdate(propuesta.id, updated);
      toast.success("Estado actualizado");
    });
  }

  function saveNota() {
    startTransition(async () => {
      const res = await fetch(`/api/propuestas/${propuesta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notaAdmin: nota || null })
      });
      if (!res.ok) { toast.error("No se pudo guardar la nota"); return; }
      const { propuesta: updated } = await res.json();
      onUpdate(propuesta.id, updated);
      setEditNota(false);
      toast.success("Nota guardada");
    });
  }

  function deletePropuesta() {
    if (!confirm("¿Eliminar esta propuesta?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/propuestas/${propuesta.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("No se pudo eliminar"); return; }
      onDelete(propuesta.id);
      toast.success("Propuesta eliminada");
    });
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {propuesta.empresa && (
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: propuesta.empresa.color || "#64748b" }}
            >
              {propuesta.empresa.nombre}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
            {cfg.icon}{cfg.label}
          </span>
        </div>
        <button
          type="button"
          onClick={deletePropuesta}
          className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mb-1 text-sm font-semibold text-slate-800">{propuesta.titulo}</p>
      <p className="mb-2 text-xs text-slate-500 whitespace-pre-line">{propuesta.descripcion}</p>

      <p className="mb-3 text-[11px] text-slate-400">
        De: {propuesta.autorNombre}
        {propuesta.autorEmail ? ` · ${propuesta.autorEmail}` : ""}
        {" · "}{formatDateTimeEs(propuesta.createdAt)}
      </p>

      {/* Nota admin */}
      {editNota ? (
        <div className="mb-3 space-y-2">
          <Textarea
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Nota para el usuario (opcional)"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveNota} className="bg-blue-600 hover:bg-blue-700 text-xs h-7">Guardar nota</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditNota(false); setNota(propuesta.notaAdmin ?? ""); }} className="text-xs h-7">Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          {propuesta.notaAdmin ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 flex items-start justify-between gap-2">
              <span><span className="font-semibold">Nota:</span> {propuesta.notaAdmin}</span>
              <button type="button" onClick={() => setEditNota(true)} className="shrink-0 text-blue-500 hover:underline text-[11px]">Editar</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditNota(true)}
              className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline"
            >
              + Añadir nota al usuario
            </button>
          )}
        </div>
      )}

      {/* Estado buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {ESTADOS.filter(e => e !== propuesta.estado).map(e => {
          const c = ESTADO_CONFIG[e];
          return (
            <button
              key={e}
              type="button"
              onClick={() => changeEstado(e)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition hover:opacity-80 ${c.color}`}
            >
              {c.icon}{c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PropuestasAdminListProps {
  initialPropuestas: Propuesta[];
}

export function PropuestasAdminList({ initialPropuestas }: PropuestasAdminListProps) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>(initialPropuestas);
  const [filter, setFilter] = useState<PropuestaEstado | "TODAS">("TODAS");

  function onUpdate(id: string, data: Partial<Propuesta>) {
    setPropuestas(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }

  function onDelete(id: string) {
    setPropuestas(prev => prev.filter(p => p.id !== id));
  }

  const counts = {
    TODAS: propuestas.length,
    PENDIENTE: propuestas.filter(p => p.estado === "PENDIENTE").length,
    REVISADA: propuestas.filter(p => p.estado === "REVISADA").length,
    ACEPTADA: propuestas.filter(p => p.estado === "ACEPTADA").length,
    DESCARTADA: propuestas.filter(p => p.estado === "DESCARTADA").length,
  };

  const filtered = filter === "TODAS" ? propuestas : propuestas.filter(p => p.estado === filter);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["TODAS", ...ESTADOS] as const).map(e => (
          <button
            key={e}
            type="button"
            onClick={() => setFilter(e)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === e
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {e === "TODAS" ? "Todas" : ESTADO_CONFIG[e].label} · {counts[e]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center shadow-sm">
          <Lightbulb className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">Sin propuestas {filter !== "TODAS" ? `en estado "${ESTADO_CONFIG[filter as PropuestaEstado].label}"` : ""}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <PropuestaAdminCard key={p.id} propuesta={p} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
