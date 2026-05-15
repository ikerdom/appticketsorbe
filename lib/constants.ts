import { Categoria, Estado, Prioridad } from "@prisma/client";

export const ESTADO_LABELS: Record<Estado, string> = {
  ABIERTO: "Abierto",
  EN_CURSO: "En curso",
  RESUELTO: "Resuelto"
};

export const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica"
};

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  TECNICO: "Técnico",
  ADMINISTRATIVO: "Administrativo",
  COMERCIAL: "Comercial",
  RRHH: "RRHH",
  OTROS: "Otros"
};

export const ESTADO_COLOR: Record<Estado, string> = {
  ABIERTO: "bg-blue-100 text-blue-700 border-blue-200",
  EN_CURSO: "bg-amber-100 text-amber-700 border-amber-200",
  RESUELTO: "bg-emerald-100 text-emerald-700 border-emerald-200"
};

export const PRIORIDAD_COLOR: Record<Prioridad, string> = {
  CRITICA: "bg-red-100 text-red-700 border-red-200",
  ALTA: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIA: "bg-yellow-100 text-yellow-700 border-yellow-200",
  BAJA: "bg-slate-100 text-slate-700 border-slate-200"
};

