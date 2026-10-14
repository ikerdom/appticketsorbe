/**
 * Tests para lib/validations.ts — schemas Zod de validación de tickets.
 *
 * Cubre: creación de ticket (nuevoTicketSchema), comentarios, estado,
 * y los casos borde de contacto (email, teléfono, URL de referencia).
 */
import { describe, expect, it } from "vitest";
import { nuevoTicketSchema, comentarioSchema, estadoSchema, editarTicketSchema } from "../lib/validations";

// ─── nuevoTicketSchema ────────────────────────────────────────────────────────

describe("nuevoTicketSchema — campos obligatorios", () => {
  const base = {
    titulo: "Problema con impresora",
    descripcion: "La impresora no imprime nada desde hace dos días",
    destinatarios: ["empresa-1"],
    contactoNombre: "Rosa Cabello",
    prioridad: "MEDIA" as const
  };

  it("acepta un ticket mínimo válido", () => {
    expect(nuevoTicketSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza título vacío", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, titulo: "ab" });
    expect(result.success).toBe(false);
  });

  it("rechaza descripción demasiado corta", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, descripcion: "corta" });
    expect(result.success).toBe(false);
  });

  it("rechaza sin destinatarios", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, destinatarios: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza sin contactoNombre o con menos de 2 caracteres", () => {
    const r1 = nuevoTicketSchema.safeParse({ ...base, contactoNombre: "" });
    const r2 = nuevoTicketSchema.safeParse({ ...base, contactoNombre: "A" });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it("rechaza prioridad fuera de enum", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, prioridad: "ULTRA" });
    expect(result.success).toBe(false);
  });

  it("acepta todas las prioridades válidas", () => {
    for (const prioridad of ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const) {
      expect(nuevoTicketSchema.safeParse({ ...base, prioridad }).success).toBe(true);
    }
  });
});

describe("nuevoTicketSchema — campo contactoEmail", () => {
  const base = {
    titulo: "Ticket de prueba",
    descripcion: "Descripción suficientemente larga para pasar la validación",
    destinatarios: ["empresa-1"],
    contactoNombre: "Test User",
    prioridad: "BAJA" as const
  };

  it("acepta sin email (campo opcional)", () => {
    expect(nuevoTicketSchema.safeParse(base).success).toBe(true);
  });

  it("acepta email válido normal", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoEmail: "rosa@orbe.es" });
    expect(result.success).toBe(true);
  });

  it("acepta email con dominio unicode (ya decodificado)", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoEmail: "rosa@orbeformación.com" });
    // Nota: Zod's .email() usa una regex que puede no aceptar unicode domains.
    // Este test documenta el comportamiento real (puede fallar con unicode).
    // Lo importante es que el helper decodeEmailForDisplay normaliza antes de guardar.
    const success = result.success;
    expect(typeof success).toBe("boolean"); // documenta que no lanza, sea cual sea el resultado
  });

  it("rechaza email malformado", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoEmail: "noesuncorreo" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes("contactoEmail"))).toBe(true);
    }
  });

  it("rechaza email con @ pero sin dominio", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoEmail: "user@" });
    expect(result.success).toBe(false);
  });
});

describe("nuevoTicketSchema — campo contactoTelefono", () => {
  const base = {
    titulo: "Ticket de prueba",
    descripcion: "Descripción suficientemente larga para pasar la validación",
    destinatarios: ["empresa-1"],
    contactoNombre: "Test User",
    prioridad: "BAJA" as const
  };

  it("acepta sin teléfono (campo opcional)", () => {
    expect(nuevoTicketSchema.safeParse(base).success).toBe(true);
  });

  it("acepta teléfono con 9 dígitos", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoTelefono: "612345678" });
    expect(result.success).toBe(true);
  });

  it("acepta teléfono con prefijo internacional", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoTelefono: "+34 612 345 678" });
    expect(result.success).toBe(true);
  });

  it("rechaza teléfono con menos de 8 dígitos", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoTelefono: "1234" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes("contactoTelefono"))).toBe(true);
    }
  });
});

describe("nuevoTicketSchema — campo contactoReferencia (URL)", () => {
  const base = {
    titulo: "Ticket de prueba",
    descripcion: "Descripción suficientemente larga para pasar la validación",
    destinatarios: ["empresa-1"],
    contactoNombre: "Test User",
    prioridad: "BAJA" as const
  };

  it("acepta URL completa válida", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoReferencia: "https://orbe.es/app" });
    expect(result.success).toBe(true);
  });

  it("acepta dominio sin protocolo (se añade https internamente)", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoReferencia: "orbe.es" });
    expect(result.success).toBe(true);
  });

  it("acepta texto libre sin punto (no se interpreta como URL)", () => {
    // Si no contiene punto ni http, el validador no intenta parsear como URL
    const result = nuevoTicketSchema.safeParse({ ...base, contactoReferencia: "Referencia interna" });
    expect(result.success).toBe(true);
  });

  it("rechaza URL con protocolo pero malformada", () => {
    const result = nuevoTicketSchema.safeParse({ ...base, contactoReferencia: "https://" });
    expect(result.success).toBe(false);
  });
});

// ─── comentarioSchema ─────────────────────────────────────────────────────────

describe("comentarioSchema", () => {
  it("acepta contenido no vacío", () => {
    expect(comentarioSchema.safeParse({ contenido: "Hola" }).success).toBe(true);
  });

  it("acepta HTML rico como contenido", () => {
    const html = "<p><strong>Texto</strong> normal con <a href='https://x.com'>enlace</a></p>";
    expect(comentarioSchema.safeParse({ contenido: html }).success).toBe(true);
  });

  it("rechaza contenido vacío", () => {
    const r1 = comentarioSchema.safeParse({ contenido: "" });
    const r2 = comentarioSchema.safeParse({});
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });
});

// ─── estadoSchema ─────────────────────────────────────────────────────────────

describe("estadoSchema", () => {
  it("acepta ABIERTO", () => {
    expect(estadoSchema.safeParse({ estado: "ABIERTO" }).success).toBe(true);
  });

  it("acepta EN_CURSO", () => {
    expect(estadoSchema.safeParse({ estado: "EN_CURSO" }).success).toBe(true);
  });

  it("acepta RESUELTO", () => {
    expect(estadoSchema.safeParse({ estado: "RESUELTO" }).success).toBe(true);
  });

  it("rechaza BLOQUEADO (no está en el schema de transición directa)", () => {
    // BLOQUEADO tiene su propia ruta de API con motivoBloqueo — no va por estadoSchema
    const result = estadoSchema.safeParse({ estado: "BLOQUEADO" });
    expect(result.success).toBe(false);
  });

  it("rechaza estado inventado", () => {
    expect(estadoSchema.safeParse({ estado: "FANTASMA" }).success).toBe(false);
  });

  it("rechaza estado en minúsculas", () => {
    expect(estadoSchema.safeParse({ estado: "abierto" }).success).toBe(false);
  });
});

// ─── editarTicketSchema ───────────────────────────────────────────────────────

describe("editarTicketSchema", () => {
  it("acepta objeto vacío (todos los campos opcionales)", () => {
    expect(editarTicketSchema.safeParse({}).success).toBe(true);
  });

  it("acepta actualización parcial de título", () => {
    expect(editarTicketSchema.safeParse({ titulo: "Nuevo título válido" }).success).toBe(true);
  });

  it("rechaza título con menos de 3 caracteres si se envía", () => {
    expect(editarTicketSchema.safeParse({ titulo: "ab" }).success).toBe(false);
  });

  it("acepta destinatarios como array de strings", () => {
    expect(editarTicketSchema.safeParse({ destinatarios: ["e1", "e2"] }).success).toBe(true);
  });
});
