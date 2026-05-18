export function normalizeCategory(input: string) {
  const cleaned = input.trim();
  if (!cleaned) return "";
  return cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function isSlaBreached(updatedAt: Date | string, slaHours: number, now = new Date()) {
  if (!slaHours || slaHours <= 0) return false;
  const lastUpdate = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const msLimit = slaHours * 60 * 60 * 1000;
  return now.getTime() - lastUpdate.getTime() > msLimit;
}

export function ticketCode(prefix: string, numero: number) {
  const base = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  return `${base.slice(0, 3).padEnd(3, "X")}-${String(numero).padStart(4, "0")}`;
}
