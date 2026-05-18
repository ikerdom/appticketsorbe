import { describe, expect, it } from "vitest";
import { isSlaBreached, normalizeCategory } from "../lib/ticket-utils";

describe("ticket utils", () => {
  it("normaliza categorías en formato canónico", () => {
    expect(normalizeCategory(" técnico ")).toBe("TECNICO");
    expect(normalizeCategory("TÉCNICO")).toBe("TECNICO");
  });

  it("detecta incumplimiento de SLA", () => {
    const now = new Date("2026-05-15T12:00:00.000Z");
    expect(isSlaBreached(new Date("2026-05-15T08:00:00.000Z"), 3, now)).toBe(true);
    expect(isSlaBreached(new Date("2026-05-15T10:00:00.000Z"), 3, now)).toBe(false);
  });
});
