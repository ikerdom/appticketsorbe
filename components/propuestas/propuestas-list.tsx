"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Lightbulb, Clock, CheckCircle2, XCircle, Eye, Plus } from "lucide-react";
import { formatDateTimeEs } from "@/lib/dates";
import { PropuestaForm } from "./propuesta-form";
import { Button } from "@/components/ui/button";

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
}

const ESTADO_CONFIG: Record<PropuestaEstado, { label: string; icon: React.ReactNode; color: string }> = {
  PENDIENTE: { label: "Pendiente revisión", icon: <Clock className="h-3.5 w-3.5" />, color: "bg-slate-100 text-slate-600" },
  REVISADA: { label: "Revisada", icon: <Eye className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-700" },
  ACEPTADA: { label: "Aceptada", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-emerald-100 text-emerald-700" },
  DESCARTADA: { label: "Descartada", icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-600" }
};

interface PropuestasListProps {
  initialPropuestas: Propuesta[];
  defaultAutorNombre: string;
  defaultAutorEmail: string;
}

export function PropuestasList({ initialPropuestas, defaultAutorNombre, defaultAutorEmail }: PropuestasListProps) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>(initialPropuestas);
  const [showForm, setShowForm] = useState(false);

  function onCreated(p: unknown) {
    setPropuestas(prev => [p as Propuesta, ...prev]);
    setShowForm(false);
  }

  async function deletePropuesta(id: string) {
    if (!confirm("¿Eliminar esta propuesta?")) return;
    const res = await fetch(`/api/propuestas/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar"); return; }
    setPropuestas(prev => prev.filter(p => p.id !== id));
    toast.success("Propuesta eliminada");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {propuestas.length} propuesta{propuestas.length !== 1 ? "s" : ""}
        </span>
        <Button onClick={() => setShowForm(v => !v)} className="bg-amber-500 hover:bg-amber-600" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nueva propuesta
        </Button>
      </div>

      {showForm && (
        <PropuestaForm
          defaultAutorNombre={defaultAutorNombre}
          defaultAutorEmail={defaultAutorEmail}
          onCreated={onCreated}
        />
      )}

      {propuestas.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center shadow-sm">
          <Lightbulb className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="mb-1 text-sm font-medium text-slate-600">Sin propuestas todavía</p>
          <p className="mb-4 text-xs text-slate-400">Comparte tus ideas para mejorar la plataforma</p>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600" size="sm">
            <Plus className="mr-1 h-4 w-4" /> Nueva propuesta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {propuestas.map(p => {
            const cfg = ESTADO_CONFIG[p.estado];
            return (
              <div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePropuesta(p.id)}
                    className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-800">{p.titulo}</p>
                <p className="mb-2 text-xs text-slate-500 whitespace-pre-line">{p.descripcion}</p>
                {p.notaAdmin && (
                  <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <span className="font-semibold">Nota del administrador:</span> {p.notaAdmin}
                  </div>
                )}
                <p className="text-[11px] text-slate-400">{formatDateTimeEs(p.createdAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
