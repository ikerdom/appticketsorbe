"use client";

import { Clock, CheckCircle2, Circle, Timer, Zap } from "lucide-react";
import { calcTicketTiming, formatHoras, SLA_BADGE } from "@/lib/ticket-timing";
import { formatDateTimeEs } from "@/lib/dates";

interface Props {
  createdAt: Date | string;
  resueltoAt: Date | string | null;
  historial: { accion: string; detalle: unknown; createdAt: Date | string }[];
  horasDedicadas?: number | null;
  estado: string;
}

export function TicketLifecycle({ createdAt, resueltoAt, historial, horasDedicadas, estado }: Props) {
  const timing = calcTicketTiming(createdAt, resueltoAt, historial);

  const steps = [
    {
      key: "abierto",
      label: "Abierto",
      sublabel: formatDateTimeEs(createdAt),
      icon: <Circle className="h-4 w-4" />,
      done: true,
      duration: timing.respuestaHoras !== null ? `Espera: ${formatHoras(timing.respuestaHoras)}` : null,
      color: "text-slate-500 border-slate-300 bg-slate-50"
    },
    {
      key: "en_curso",
      label: "En curso",
      sublabel: timing.respuestaHoras !== null
        ? `1ª respuesta en ${formatHoras(timing.respuestaHoras)}`
        : "Sin respuesta aún",
      icon: <Clock className="h-4 w-4" />,
      done: estado === "EN_CURSO" || estado === "RESUELTO",
      duration: timing.enCursoHoras !== null ? `Duración: ${formatHoras(timing.enCursoHoras)}` : null,
      color: "text-amber-600 border-amber-300 bg-amber-50"
    },
    {
      key: "resuelto",
      label: "Resuelto",
      sublabel: resueltoAt ? formatDateTimeEs(resueltoAt) : "Pendiente",
      icon: <CheckCircle2 className="h-4 w-4" />,
      done: estado === "RESUELTO",
      duration: null,
      color: "text-emerald-600 border-emerald-300 bg-emerald-50"
    }
  ];

  const slaCfg = timing.slaLevel ? SLA_BADGE[timing.slaLevel] : null;

  return (
    <div className="space-y-3">
      {/* Timeline steps */}
      <div className="flex items-start gap-0">
        {steps.map((step, i) => (
          <div key={step.key} className="flex flex-1 flex-col items-center">
            {/* Connector left */}
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : step.done ? "bg-indigo-300" : "bg-slate-200"}`} />
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                step.done ? `${step.color} border-current` : "border-slate-200 bg-white text-slate-300"
              }`}>
                {step.icon}
              </div>
              <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? "opacity-0" : step.done && steps[i + 1]?.done ? "bg-indigo-300" : "bg-slate-200"}`} />
            </div>
            {/* Label */}
            <div className="mt-2 px-1 text-center">
              <p className={`text-xs font-semibold ${step.done ? "text-slate-700" : "text-slate-400"}`}>{step.label}</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{step.sublabel}</p>
              {step.duration && (
                <p className="text-[10px] font-medium text-indigo-600 mt-0.5">{step.duration}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricChip
          icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}
          label="1ª respuesta"
          value={formatHoras(timing.respuestaHoras)}
          sub={timing.respuestaHoras === null ? "Sin respuesta" : undefined}
        />
        <MetricChip
          icon={<Timer className="h-3.5 w-3.5 text-indigo-500" />}
          label="Tiempo total"
          value={timing.totalHoras !== null ? formatHoras(timing.totalHoras) : "En proceso"}
          sub={timing.totalHoras === null ? `${formatHoras((Date.now() - new Date(createdAt).getTime()) / 3600000)} abierto` : undefined}
        />
        <MetricChip
          icon={<Clock className="h-3.5 w-3.5 text-slate-500" />}
          label="En gestión"
          value={formatHoras(timing.enCursoHoras)}
        />
        <MetricChip
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          label="Horas dedicadas"
          value={horasDedicadas != null ? `${horasDedicadas}h` : "—"}
          sub={horasDedicadas != null ? "Manual" : "Sin registrar"}
        />
      </div>

      {/* SLA badge */}
      {slaCfg && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${slaCfg.color}`}>
            {slaCfg.label}
          </span>
          <span className="text-xs text-slate-400">
            {timing.totalHoras !== null
              ? `Resuelto en ${formatHoras(timing.totalHoras)}`
              : `Abierto hace ${formatHoras((Date.now() - new Date(createdAt).getTime()) / 3600000)}`}
          </span>
        </div>
      )}
    </div>
  );
}

function MetricChip({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-800">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}
