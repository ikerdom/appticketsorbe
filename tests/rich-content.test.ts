import { describe, expect, it } from "vitest";
import { extractReferencedAdjuntoIds, isRichContentEmpty, looksLikeHtml, stripHtml, toDisplayHtml } from "../lib/rich-content";

describe("stripHtml", () => {
  it("quita las etiquetas y deja solo el texto", () => {
    expect(stripHtml("<p>Hola <strong>mundo</strong></p>")).toBe("Hola mundo");
  });

  it("convierte &nbsp; en espacio normal", () => {
    expect(stripHtml("<p>Hola&nbsp;mundo</p>")).toBe("Hola mundo");
  });

  it("no cuenta el markup de una imagen como texto (B011 — no debe inflar el contador de caracteres)", () => {
    expect(stripHtml('<p>Texto<img src="/api/adjuntos/abc123" alt="captura pantalla completa"></p>').length).toBe("Texto".length);
  });

  it("recorta espacios al principio/final", () => {
    expect(stripHtml("<p>  Hola  </p>")).toBe("Hola");
  });
});

describe("isRichContentEmpty", () => {
  it("vacío sin texto ni imagen", () => {
    expect(isRichContentEmpty("<p></p>")).toBe(true);
  });

  it("no vacío si solo tiene una imagen (sin texto)", () => {
    expect(isRichContentEmpty('<p><img src="/api/adjuntos/abc123"></p>')).toBe(false);
  });

  it("no vacío con texto real", () => {
    expect(isRichContentEmpty("<p>algo</p>")).toBe(false);
  });
});

describe("looksLikeHtml / toDisplayHtml — compatibilidad con descripciones legacy (pre-editor rico)", () => {
  it("detecta HTML del editor nuevo", () => {
    expect(looksLikeHtml("<p>Hola</p>")).toBe(true);
  });

  it("detecta texto plano legacy", () => {
    expect(looksLikeHtml("Hola\nmundo")).toBe(false);
  });

  it("escapa texto plano legacy y conserva los saltos de línea como <br />", () => {
    expect(toDisplayHtml("Hola\nmundo")).toBe("<p>Hola<br />mundo</p>");
  });

  it("un ticket legacy con < o > sueltos en el texto no se malinterpreta como HTML real", () => {
    // "5 < 10" no matchea looksLikeHtml (exige <letra ... >, no un < seguido de dígito) —
    // se trata como texto plano y se escapa, no se pierde contenido.
    expect(toDisplayHtml("El contador marca 5 < 10 y no sube")).toBe("<p>El contador marca 5 &lt; 10 y no sube</p>");
  });
});

describe("extractReferencedAdjuntoIds", () => {
  it("extrae los ids de /adjuntos/{id} referenciados inline", () => {
    const html = '<p>Mira <img src="/api/adjuntos/abc123"> y <img src="/api/adjuntos/def456"></p>';
    expect(extractReferencedAdjuntoIds([html])).toEqual(new Set(["abc123", "def456"]));
  });

  it("dedupe entre varias fuentes (descripcion + comentarios)", () => {
    const a = '<img src="/api/adjuntos/abc123">';
    const b = '<img src="/api/adjuntos/abc123"><img src="/api/adjuntos/xyz789">';
    expect(extractReferencedAdjuntoIds([a, b])).toEqual(new Set(["abc123", "xyz789"]));
  });

  it("vacío si no hay imágenes referenciadas", () => {
    expect(extractReferencedAdjuntoIds(["<p>sin imagenes</p>"]).size).toBe(0);
  });
});
