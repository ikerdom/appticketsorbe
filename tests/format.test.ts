/**
 * Tests para lib/format.ts — helpers de decodificación punycode/IDNA.
 *
 * Contexto: dominios con caracteres especiales (ej. orbeformación.com) se
 * encodifican en ASCII como xn--orbeformacin-bib.com. El navegador lo hace al
 * autocompletar emails. Estos helpers los muestran en formato legible.
 */
import { describe, expect, it } from "vitest";
import { decodeEmailForDisplay, decodeUrlForDisplay } from "../lib/format";

// ─── decodeEmailForDisplay ────────────────────────────────────────────────────

describe("decodeEmailForDisplay", () => {
  it("decodifica un dominio punycode a unicode", () => {
    expect(decodeEmailForDisplay("rosa.cabello@xn--orbeformacin-bib.com"))
      .toBe("rosa.cabello@orbeformación.com");
  });

  it("no toca un email con dominio ASCII normal", () => {
    expect(decodeEmailForDisplay("iker@orbe.es")).toBe("iker@orbe.es");
  });

  it("no toca un email con dominio ya en unicode", () => {
    expect(decodeEmailForDisplay("rosa@orbeformación.com")).toBe("rosa@orbeformación.com");
  });

  it("devuelve cadena vacía para null", () => {
    expect(decodeEmailForDisplay(null)).toBe("");
  });

  it("devuelve cadena vacía para undefined", () => {
    expect(decodeEmailForDisplay(undefined)).toBe("");
  });

  it("devuelve cadena vacía para string vacío", () => {
    expect(decodeEmailForDisplay("")).toBe("");
  });

  it("devuelve el email tal cual si no contiene @", () => {
    expect(decodeEmailForDisplay("noesuncorreo")).toBe("noesuncorreo");
  });

  it("preserva la parte local del email intacta (antes del @)", () => {
    const result = decodeEmailForDisplay("usuario.con.puntos@xn--orbeformacin-bib.com");
    expect(result).toMatch(/^usuario\.con\.puntos@/);
    expect(result).toBe("usuario.con.puntos@orbeformación.com");
  });

  it("usa solo el último @ si hay varios (dirección exótica)", () => {
    // Formato válido: "a@b"@domain.com — el lastIndexOf(@) toma el último
    const result = decodeEmailForDisplay("a@b@orbe.es");
    expect(result).toBe("a@b@orbe.es");
  });

  it("dominio malformado no lanza excepción — devuelve el original", () => {
    expect(() => decodeEmailForDisplay("user@not valid domain")).not.toThrow();
    expect(decodeEmailForDisplay("user@not valid domain")).toBe("user@not valid domain");
  });

  it("dominio con subdominio punycode se decodifica", () => {
    // xn--caf-dma.fr es café.fr
    const result = decodeEmailForDisplay("user@xn--caf-dma.fr");
    expect(result).toBe("user@café.fr");
  });

  it("email ya en unicode con dominio normal pasa sin cambios", () => {
    expect(decodeEmailForDisplay("iker.dominguez@entenova.gnosis.com"))
      .toBe("iker.dominguez@entenova.gnosis.com");
  });
});

// ─── decodeUrlForDisplay ─────────────────────────────────────────────────────

describe("decodeUrlForDisplay", () => {
  it("decodifica un hostname punycode en una URL completa", () => {
    const result = decodeUrlForDisplay("https://xn--orbeformacin-bib.com/path?q=1");
    expect(result).toBe("https://orbeformación.com/path?q=1");
  });

  it("decodifica una URL sin protocolo (añade https internamente)", () => {
    const result = decodeUrlForDisplay("xn--orbeformacin-bib.com");
    expect(result).toBe("orbeformación.com");
  });

  it("no toca una URL con dominio ASCII normal", () => {
    const url = "https://orbe.es/tickets/123";
    expect(decodeUrlForDisplay(url)).toBe(url);
  });

  it("preserva el path, query y fragment", () => {
    const result = decodeUrlForDisplay("https://xn--orbeformacin-bib.com/a/b?c=d#e");
    expect(result).toContain("/a/b?c=d#e");
  });

  it("devuelve cadena vacía para null", () => {
    expect(decodeUrlForDisplay(null)).toBe("");
  });

  it("devuelve cadena vacía para undefined", () => {
    expect(decodeUrlForDisplay(undefined)).toBe("");
  });

  it("devuelve cadena vacía para string vacío", () => {
    expect(decodeUrlForDisplay("")).toBe("");
  });

  it("URL malformada no lanza excepción — devuelve el original", () => {
    expect(() => decodeUrlForDisplay("no es una url valida")).not.toThrow();
    expect(decodeUrlForDisplay("no es una url valida")).toBe("no es una url valida");
  });
});
