"use client";

import { useState } from "react";
import { Lightbulb, Clock, CheckCircle2, XCircle, Eye, Plus } from "lucide-react";
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

const ESTADO_CONFIG: Record<PropuestaEstado, { label: string; icon: React.ReactNode; color: string; border: string; hint: string }> = {
  PENDIENTE: { label: "Pendiente revisión", icon: <Clock className="h-3.5 w-3.5" />, color: "bg-slate-100 text-slate-600", border: "border-l-slate-300", hint: "Un administrador la revisará pronto" },
  REVISADA: { label: "En revisión", icon: <Eye className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-700", border: "border-l-blue-400", hint: "Está siendo valorada" },
  ACEPTADA: { label: "Aceptada", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400", hint: "" },
  DESCARTADA: { label: "Descartada", icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-600", border: "border-l-red-300", hint: "" }
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

  const pendientes = propuestas.filter(p => p.estado === "PENDIENTE").length;
  const aceptadas = propuestas.filter(p => p.estado === "ACEPTADA").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {propuestas.length} propuesta{propuestas.length !== 1 ? "s" : ""}
        </span>
        {pendientes > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
          </span>
        )}
        {aceptadas > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            ✓ {aceptadas} aceptada{aceptadas !== 1 ? "s" : ""}
          </span>
        )}
        <div className="flex-1" />
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
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Lightbulb className="h-7 w-7 text-amber-500" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-700">Sin propuestas todavía</p>
          <p className="mb-5 mx-auto max-w-xs text-sm text-slate-400">
            ¿Tienes una idea para mejorar la plataforma o los procesos del equipo? Compártela aquí.
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="mr-1.5 h-4 w-4" /> Nueva propuesta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {propuestas.map(p => {
            const cfg = ESTADO_CONFIG[p.estado];
            return (
              <div key={p.id} className={`rounded-xl border border-l-4 ${cfg.border} bg-white p-4 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDateTimeEs(p.createdAt)}</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold leading-snug text-slate-800">{p.titulo}</p>
                <p className="mb-3 text-xs leading-relaxed text-slate-500 whitespace-pre-line">{p.descripcion}</p>
                {p.notaAdmin ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <span className="font-semibold">💬 Respuesta:</span> {p.notaAdmin}
                  </div>
                ) : cfg.hint ? (
                  <p className="text-[11px] italic text-slate-400">{cfg.hint}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
