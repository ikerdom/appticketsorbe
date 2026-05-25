/**
 * Ticket lifecycle timing utilities.
 * Calculates durations from historial (state-change log) and ticket timestamps.
 */

export interface HistorialEntry {
  accion: string;
  detalle: unknown;
  createdAt: Date | string;
}

export interface TicketTiming {
  /** Total time from creation to resolution (null if not resolved) */
  totalHoras: number | null;
  /** Time from creation to first EN_CURSO transition (first response time) */
  respuestaHoras: number | null;
  /** Time spent in EN_CURSO state (first EN_CURSO → RESUELTO) */
  enCursoHoras: number | null;
  /** Time spent open before first response */
  abiertaHoras: number | null;
  /** Whether resolved within SLA (72h) */
  slaOk: boolean | null;
  /** SLA status */
  slaLevel: "ok" | "warning" | "breach" | null;
}

export function calcTicketTiming(
  createdAt: Date | string,
  resueltoAt: Date | string | null,
  historial: HistorialEntry[]
): TicketTiming {
  const created = new Date(createdAt).getTime();
  const resuelto = resueltoAt ? new Date(resueltoAt).getTime() : null;

  // Find first transition TO EN_CURSO
  const firstEnCursoEntry = historial.find((h) => {
    if (h.accion !== "ESTADO_CAMBIADO" && h.accion !== "TICKET_COGIDO") return false;
    const d = h.detalle as Record<string, unknown>;
    return d?.a === "EN_CURSO" || h.accion === "TICKET_COGIDO";
  });
  const firstEnCursoAt = firstEnCursoEntry ? new Date(firstEnCursoEntry.createdAt).getTime() : null;

  const totalHoras = resuelto ? (resuelto - created) / 3600000 : null;
  const respuestaHoras = firstEnCursoAt ? (firstEnCursoAt - created) / 3600000 : null;
  const abiertaHoras = respuestaHoras;
  const enCursoHoras = firstEnCursoAt && resuelto ? (resuelto - firstEnCursoAt) / 3600000 : null;

  let slaOk: boolean | null = null;
  let slaLevel: TicketTiming["slaLevel"] = null;

  if (totalHoras !== null) {
    slaOk = totalHoras <= 72;
    if (totalHoras <= 24) slaLevel = "ok";
    else if (totalHoras <= 48) slaLevel = "warning";
    else slaLevel = "breach";
  } else {
    // Not resolved yet — check age
    const ageHoras = (Date.now() - created) / 3600000;
    if (ageHoras <= 24) slaLevel = "ok";
    else if (ageHoras <= 48) slaLevel = "warning";
    else slaLevel = "breach";
  }

  return { totalHoras, respuestaHoras, enCursoHoras, abiertaHoras, slaOk, slaLevel };
}

/**
 * Format hours as human-readable string: "2h 30m" or "3d 4h"
 */
export function formatHoras(horas: number | null): string {
  if (horas === null) return "—";
  if (horas < 1) return `${Math.round(horas * 60)}m`;
  if (horas < 24) return `${Math.floor(horas)}h ${Math.round((horas % 1) * 60)}m`;
  const dias = Math.floor(horas / 24);
  const restantes = Math.floor(horas % 24);
  return restantes > 0 ? `${dias}d ${restantes}h` : `${dias}d`;
}

/**
 * SLA badge styles by level
 */
export const SLA_BADGE: Record<string, { label: string; color: string }> = {
  ok:      { label: "Dentro de SLA",  color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
  warning: { label: "SLA en riesgo",  color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  breach:  { label: "SLA superado",   color: "bg-red-100 text-red-700 ring-1 ring-red-200 font-bold" }
};
