import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function formatDateTimeEs(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

export function formatDateEs(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium"
  }).format(parsed);
}

export function formatRelativeEs(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(parsed, { addSuffix: true, locale: es });
}
