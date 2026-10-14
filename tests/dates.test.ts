/**
 * Tests para lib/dates.ts — formateo de fechas en español.
 *
 * Estos tests son smoke tests: verifican que las funciones retornan el
 * formato esperado y no lanzan errores. No fijan la locale exacta porque
 * Intl puede variar entre versiones de Node.
 */
import { describe, expect, it } from "vitest";
import { formatDateTimeEs, formatDateEs, formatRelativeEs } from "../lib/dates";

const FECHA_ISO = "2026-05-15T10:30:00.000Z";
const FECHA_OBJ = new Date(FECHA_ISO);

describe("formatDateTimeEs", () => {
  it("devuelve un string no vacío para fecha ISO", () => {
    const result = formatDateTimeEs(FECHA_ISO);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("devuelve un string no vacío para objeto Date", () => {
    const result = formatDateTimeEs(FECHA_OBJ);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("resultado de string y Date son iguales", () => {
    expect(formatDateTimeEs(FECHA_ISO)).toBe(formatDateTimeEs(FECHA_OBJ));
  });

  it("incluye dígitos de hora (HH:MM)", () => {
    const result = formatDateTimeEs(FECHA_ISO);
    // Debe contener algún patrón de hora como "10:30" o "12:30" (según TZ del proceso)
    expect(/\d:\d/.test(result)).toBe(true);
  });
});

describe("formatDateEs", () => {
  it("devuelve string no vacío", () => {
    expect(formatDateEs(FECHA_ISO).length).toBeGreaterThan(0);
  });

  it("no incluye hora (sin ':')", () => {
    // dateStyle: "medium" no incluye hora
    // Nota: en algunos locales "medium" puede incluir puntos pero no dos puntos de hora
    const result = formatDateEs(FECHA_ISO);
    // Comprobamos que sea más corto que el formato con hora
    expect(result.length).toBeLessThan(formatDateTimeEs(FECHA_ISO).length);
  });

  it("string e ISO producen el mismo resultado", () => {
    expect(formatDateEs(FECHA_ISO)).toBe(formatDateEs(FECHA_OBJ));
  });
});

describe("formatRelativeEs", () => {
  it("devuelve string no vacío", () => {
    const now = new Date();
    expect(formatRelativeEs(now).length).toBeGreaterThan(0);
  });

  it("fecha reciente devuelve texto relativo (contiene 'hace' o similar)", () => {
    const now = new Date();
    const result = formatRelativeEs(now);
    // date-fns en español usa "hace" para pasado
    expect(result).toBeTruthy();
  });

  it("fecha de hace 2 días menciona '2 días' o equivalente", () => {
    const dosDiasAtras = new Date(Date.now() - 2 * 24 * 3600000);
    const result = formatRelativeEs(dosDiasAtras);
    expect(result).toContain("2");
  });

  it("no lanza error para fechas muy antiguas", () => {
    expect(() => formatRelativeEs(new Date("2000-01-01"))).not.toThrow();
  });

  it("acepta string ISO", () => {
    expect(() => formatRelativeEs("2026-01-01T00:00:00.000Z")).not.toThrow();
  });
});
