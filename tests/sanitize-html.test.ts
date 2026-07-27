import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "../lib/sanitize-html";

describe("sanitizeRichText", () => {
  it("mantiene <img src> a nuestra ruta de adjuntos de ticket (regresión B011)", () => {
    const html = '<p><img src="/api/tickets/abc/adjuntos/xyz" alt="captura"></p>';
    expect(sanitizeRichText(html)).toContain('src="/api/tickets/abc/adjuntos/xyz"');
  });

  it("mantiene <img src> a la ruta de adjuntos huérfanos (regresión B011 — creación de ticket)", () => {
    const html = '<p><img src="/api/adjuntos/xyz" alt="captura"></p>';
    expect(sanitizeRichText(html)).toContain('src="/api/adjuntos/xyz"');
  });

  it("mantiene <img src> a la ruta pública de tickets", () => {
    const html = '<p><img src="/api/public/tickets/abc/adjuntos/xyz"></p>';
    expect(sanitizeRichText(html)).toContain('src="/api/public/tickets/abc/adjuntos/xyz"');
  });

  it("mantiene blob: temporal (mientras una imagen recién pegada está subiendo)", () => {
    const html = '<p><img src="blob:http://localhost:3000/temp-id"></p>';
    expect(sanitizeRichText(html)).toContain("blob:http://localhost:3000/temp-id");
  });

  it("quita <img src> externo http(s) (tracker pixel) aunque <a href> https sí se permita", () => {
    const html = '<p><img src="https://evil.com/pixel.png" alt="x"></p>';
    const out = sanitizeRichText(html);
    expect(out).not.toContain("evil.com");
  });

  it("quita el src si la URI no matchea ningún patrón permitido (p.ej. javascript:)", () => {
    const html = '<p><img src="javascript:alert(1)" alt="x"></p>';
    const out = sanitizeRichText(html);
    expect(out).not.toContain("javascript:");
  });

  it("quita etiquetas no permitidas (script) pero conserva el texto", () => {
    const html = "<p>Hola<script>alert(1)</script>mundo</p>";
    const out = sanitizeRichText(html);
    expect(out).not.toContain("<script");
    expect(out).toContain("Hola");
    expect(out).toContain("mundo");
  });

  it("quita atributos de evento (onerror, onclick)", () => {
    const html = '<p><img src="/api/adjuntos/xyz" onerror="alert(1)"></p>';
    expect(sanitizeRichText(html)).not.toContain("onerror");
  });

  it("conserva formato básico permitido (negrita, listas, enlaces)", () => {
    const html = '<p><strong>fuerte</strong></p><ul><li>item</li></ul><a href="https://example.com">link</a>';
    const out = sanitizeRichText(html);
    expect(out).toContain("<strong>fuerte</strong>");
    expect(out).toContain("<li>item</li>");
    expect(out).toContain('href="https://example.com"');
  });
});
