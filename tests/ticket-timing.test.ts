import { describe, it, expect } from "vitest";
import { calcTicketTiming, formatHoras, SLA_BADGE } from "../lib/ticket-timing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function h(hours: number, from = new Date("2026-05-01T00:00:00Z")) {
  return new Date(from.getTime() + hours * 3600000).toISOString();
}

const BASE = new Date("2026-05-01T00:00:00Z");

function historialEntry(accion: string, a: string, hoursFromBase: number) {
  return {
    accion,
    detalle: { de: "ABIERTO", a },
    createdAt: h(hoursFromBase)
  };
}

// ─── calcTicketTiming ────────────────────────────────────────────────────────

describe("calcTicketTiming", () => {
  it("ticket recién abierto sin historial", () => {
    const result = calcTicketTiming(BASE, null, []);
    expect(result.totalHoras).toBeNull();
    expect(result.respuestaHoras).toBeNull();
    expect(result.enCursoHoras).toBeNull();
    expect(result.slaOk).toBeNull();
    // slaLevel depends on current time vs BASE — just check it's set
    expect(result.slaLevel).toBeDefined();
  });

  it("ticket resuelto sin pasar por EN_CURSO", () => {
    const result = calcTicketTiming(BASE, h(10), []);
    expect(result.totalHoras).toBeCloseTo(10, 1);
    expect(result.respuestaHoras).toBeNull();
    expect(result.enCursoHoras).toBeNull();
    expect(result.slaOk).toBe(true); // 10h < 72h
    expect(result.slaLevel).toBe("ok"); // 10h <= 24h
  });

  it("ticket con primer EN_CURSO a las 2h y resuelto a las 8h", () => {
    const historial = [historialEntry("ESTADO_CAMBIADO", "EN_CURSO", 2)];
    const result = calcTicketTiming(BASE, h(8), historial);

    expect(result.totalHoras).toBeCloseTo(8, 1);
    expect(result.respuestaHoras).toBeCloseTo(2, 1);
    expect(result.enCursoHoras).toBeCloseTo(6, 1); // 8 - 2
    expect(result.slaOk).toBe(true);
    expect(result.slaLevel).toBe("ok");
  });

  it("ticket TICKET_COGIDO también cuenta como primera respuesta", () => {
    const historial = [
      { accion: "TICKET_COGIDO", detalle: { de: "ABIERTO", a: "EN_CURSO" }, createdAt: h(3) }
    ];
    const result = calcTicketTiming(BASE, h(50), historial);

    expect(result.respuestaHoras).toBeCloseTo(3, 1);
    expect(result.totalHoras).toBeCloseTo(50, 1);
    // 50h: slaOk = 50 <= 72 = true; slaLevel = 50 > 48 → "breach" (visual urgency, not SLA compliance)
    expect(result.slaOk).toBe(true);
    expect(result.slaLevel).toBe("breach");
  });

  it("ticket SLA vencido (>72h total)", () => {
    const historial = [historialEntry("ESTADO_CAMBIADO", "EN_CURSO", 5)];
    const result = calcTicketTiming(BASE, h(80), historial);

    expect(result.totalHoras).toBeCloseTo(80, 1);
    expect(result.slaOk).toBe(false);
    expect(result.slaLevel).toBe("breach");
  });

  it("toma primer EN_CURSO solo (ignora transiciones posteriores)", () => {
    const historial = [
      historialEntry("ESTADO_CAMBIADO", "EN_CURSO", 3),
      historialEntry("ESTADO_CAMBIADO", "ABIERTO", 5), // paused
      historialEntry("ESTADO_CAMBIADO", "EN_CURSO", 8)  // resumed
    ];
    const result = calcTicketTiming(BASE, h(20), historial);
    expect(result.respuestaHoras).toBeCloseTo(3, 1); // first EN_CURSO wins
  });

  it("historial con acción irrelevante no afecta respuesta", () => {
    const historial = [
      { accion: "COMENTARIO_AÑADIDO", detalle: {}, createdAt: h(1) },
      historialEntry("ESTADO_CAMBIADO", "EN_CURSO", 5)
    ];
    const result = calcTicketTiming(BASE, h(10), historial);
    expect(result.respuestaHoras).toBeCloseTo(5, 1);
  });

  it("slaLevel ok cuando total ≤ 24h", () => {
    const result = calcTicketTiming(BASE, h(12), []);
    expect(result.slaLevel).toBe("ok");
    expect(result.slaOk).toBe(true);
  });

  it("slaLevel warning cuando 24 < total ≤ 48h", () => {
    const result = calcTicketTiming(BASE, h(36), []);
    expect(result.slaLevel).toBe("warning");
    expect(result.slaOk).toBe(true);
  });

  it("slaLevel breach cuando total > 48h (pero puede estar dentro de 72h SLA)", () => {
    const result = calcTicketTiming(BASE, h(60), []);
    expect(result.slaLevel).toBe("breach");
    expect(result.slaOk).toBe(true); // 60 < 72h → still within SLA window
  });

  it("slaOk false cuando total > 72h", () => {
    const result = calcTicketTiming(BASE, h(73), []);
    expect(result.slaOk).toBe(false);
    expect(result.slaLevel).toBe("breach");
  });
});

// ─── formatHoras ─────────────────────────────────────────────────────────────

describe("formatHoras", () => {
  it("null → —", () => {
    expect(formatHoras(null)).toBe("—");
  });

  it("menos de 1 hora → minutos", () => {
    expect(formatHoras(0.5)).toBe("30m");
    expect(formatHoras(0.25)).toBe("15m");
  });

  it("horas exactas", () => {
    expect(formatHoras(2)).toBe("2h 0m");
    expect(formatHoras(23)).toBe("23h 0m");
  });

  it("horas con minutos", () => {
    expect(formatHoras(2.5)).toBe("2h 30m");
    expect(formatHoras(1.75)).toBe("1h 45m");
  });

  it("días exactos", () => {
    expect(formatHoras(24)).toBe("1d");
    expect(formatHoras(48)).toBe("2d");
    expect(formatHoras(72)).toBe("3d");
  });

  it("días con horas restantes", () => {
    expect(formatHoras(25)).toBe("1d 1h");
    expect(formatHoras(36)).toBe("1d 12h");
    expect(formatHoras(50)).toBe("2d 2h");
  });
});

// ─── SLA_BADGE ────────────────────────────────────────────────────────────────

describe("SLA_BADGE", () => {
  it("ok badge verde", () => {
    expect(SLA_BADGE.ok.label).toBe("Dentro de SLA");
    expect(SLA_BADGE.ok.color).toContain("emerald");
  });

  it("warning badge ámbar", () => {
    expect(SLA_BADGE.warning.label).toBe("SLA en riesgo");
    expect(SLA_BADGE.warning.color).toContain("amber");
  });

  it("breach badge rojo", () => {
    expect(SLA_BADGE.breach.label).toBe("SLA superado");
    expect(SLA_BADGE.breach.color).toContain("red");
  });
});
