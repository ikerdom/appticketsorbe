/**
 * Tests para lib/ticket-utils.ts — utilidades de tickets.
 *
 * Cubre: normalización de categorías, SLA breach detection, ticketCode.
 */
import { describe, expect, it } from "vitest";
import { isSlaBreached, normalizeCategory, ticketCode } from "../lib/ticket-utils";

// ─── normalizeCategory ────────────────────────────────────────────────────────

describe("normalizeCategory", () => {
  it("elimina tildes y pasa a mayúsculas", () => {
    expect(normalizeCategory("técnico")).toBe("TECNICO");
    expect(normalizeCategory("TÉCNICO")).toBe("TECNICO");
    expect(normalizeCategory("administrativo")).toBe("ADMINISTRATIVO");
  });

  it("recorta espacios iniciales y finales", () => {
    expect(normalizeCategory("  técnico  ")).toBe("TECNICO");
  });

  it("colapsa espacios múltiples en uno", () => {
    expect(normalizeCategory("rr  hh")).toBe("RR HH");
  });

  it("devuelve string vacío para input vacío o solo espacios", () => {
    expect(normalizeCategory("")).toBe("");
    expect(normalizeCategory("   ")).toBe("");
  });

  it("preserva categorías ya normalizadas", () => {
    expect(normalizeCategory("TECNICO")).toBe("TECNICO");
    expect(normalizeCategory("RRHH")).toBe("RRHH");
    expect(normalizeCategory("OTROS")).toBe("OTROS");
  });

  it("elimina tildes de cualquier vocal", () => {
    expect(normalizeCategory("á é í ó ú")).toBe("A E I O U");
    expect(normalizeCategory("ñoño")).toBe("NONO");
  });
});

// ─── isSlaBreached ───────────────────────────────────────────────────────────

describe("isSlaBreached", () => {
  const now = new Date("2026-05-15T12:00:00.000Z");

  it("detecta incumplimiento cuando ha pasado más tiempo que el SLA", () => {
    const updatedAt = new Date("2026-05-15T08:00:00.000Z"); // hace 4h
    expect(isSlaBreached(updatedAt, 3, now)).toBe(true); // SLA = 3h → superado
  });

  it("no incumplimiento cuando está dentro del SLA", () => {
    const updatedAt = new Date("2026-05-15T10:00:00.000Z"); // hace 2h
    expect(isSlaBreached(updatedAt, 3, now)).toBe(false); // SLA = 3h → OK
  });

  it("límite exacto (igual al SLA) no se considera incumplimiento", () => {
    const updatedAt = new Date("2026-05-15T09:00:00.000Z"); // hace exactamente 3h
    expect(isSlaBreached(updatedAt, 3, now)).toBe(false); // > no >=
  });

  it("acepta updatedAt como string ISO", () => {
    expect(isSlaBreached("2026-05-15T08:00:00.000Z", 3, now)).toBe(true);
  });

  it("slaHours = 0 nunca incumple (guard contra división por cero)", () => {
    const updatedAt = new Date("2020-01-01T00:00:00.000Z");
    expect(isSlaBreached(updatedAt, 0, now)).toBe(false);
  });

  it("slaHours negativo nunca incumple (guard)", () => {
    const updatedAt = new Date("2020-01-01T00:00:00.000Z");
    expect(isSlaBreached(updatedAt, -1, now)).toBe(false);
  });

  it("SLA de 72h (prioridad MEDIA) — resuelto en 48h está OK", () => {
    const updatedAt = new Date(now.getTime() - 48 * 3600000);
    expect(isSlaBreached(updatedAt, 72, now)).toBe(false);
  });

  it("SLA de 72h — ticket de 80h está incumplido", () => {
    const updatedAt = new Date(now.getTime() - 80 * 3600000);
    expect(isSlaBreached(updatedAt, 72, now)).toBe(true);
  });

  it("SLA de 4h (prioridad CRITICA) — 5h de antigüedad está incumplido", () => {
    const updatedAt = new Date(now.getTime() - 5 * 3600000);
    expect(isSlaBreached(updatedAt, 4, now)).toBe(true);
  });
});

// ─── ticketCode ───────────────────────────────────────────────────────────────

describe("ticketCode", () => {
  it("genera código con prefijo de 3 letras y número de 4 dígitos", () => {
    expect(ticketCode("ORBE", 1)).toBe("ORB-0001");
    expect(ticketCode("ORBE", 93)).toBe("ORB-0093");
    expect(ticketCode("ORBE", 1234)).toBe("ORB-1234");
  });

  it("rellena el prefijo corto con X hasta 3 caracteres", () => {
    expect(ticketCode("AB", 1)).toBe("ABX-0001");
    expect(ticketCode("A", 1)).toBe("AXX-0001");
  });

  it("trunca prefijo largo a 3 caracteres", () => {
    expect(ticketCode("ENTENOVA", 5)).toBe("ENT-0005");
  });

  it("elimina tildes del prefijo", () => {
    expect(ticketCode("Técnico", 1)).toBe("TEC-0001");
  });

  it("elimina caracteres especiales del prefijo (solo alfanumérico)", () => {
    expect(ticketCode("BN-TIC", 1)).toBe("BNT-0001");
    expect(ticketCode("IT & Sistemas", 2)).toBe("ITS-0002");
  });

  it("pasa prefijo a mayúsculas", () => {
    expect(ticketCode("orbe", 99)).toBe("ORB-0099");
  });

  it("número grande no rompe el formato", () => {
    expect(ticketCode("ORBE", 9999)).toBe("ORB-9999");
    expect(ticketCode("ORBE", 10000)).toBe("ORB-10000"); // no se trunca el número
  });
});
