/**
 * Tests para lib/permisos.ts — control de acceso por rol y empresa.
 *
 * Estas funciones son críticas para la seguridad: determinan qué puede ver
 * y hacer cada usuario. Un error aquí podría exponer tickets de otras empresas.
 */
import { describe, expect, it } from "vitest";
import {
  esAdmin,
  puedeVerTicket,
  puedeEditarTicket,
  puedeEditarComentario,
  puedeMoverEstado,
  puedeEliminarTicket
} from "../lib/permisos";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const admin = { id: "admin-1", rol: "ADMIN" as const, empresaId: "emp-1" };
const user1 = { id: "user-1", rol: "USER" as const, empresaId: "emp-1" };
const user2 = { id: "user-2", rol: "USER" as const, empresaId: "emp-2" };

const ticketDeUser1 = {
  empresaOrigenId: "emp-1",
  creadorId: "user-1",
  asignadoId: null as string | null,
  estado: "ABIERTO" as const,
  destinos: [{ empresaId: "emp-1" }]
};

const ticketDeUser2 = {
  empresaOrigenId: "emp-2",
  creadorId: "user-2",
  asignadoId: null as string | null,
  estado: "EN_CURSO" as const,
  destinos: [{ empresaId: "emp-2" }]
};

const ticketAsignadoAAdmin = {
  ...ticketDeUser1,
  asignadoId: "admin-1"
};

// ─── esAdmin ──────────────────────────────────────────────────────────────────

describe("esAdmin", () => {
  it("devuelve true para ADMIN", () => {
    expect(esAdmin({ rol: "ADMIN" })).toBe(true);
  });

  it("devuelve false para USER", () => {
    expect(esAdmin({ rol: "USER" })).toBe(false);
  });
});

// ─── puedeVerTicket ───────────────────────────────────────────────────────────

describe("puedeVerTicket", () => {
  it("admin puede ver cualquier ticket", () => {
    expect(puedeVerTicket(admin, ticketDeUser2)).toBe(true);
  });

  it("creador puede ver su propio ticket", () => {
    expect(puedeVerTicket(user1, ticketDeUser1)).toBe(true);
  });

  it("usuario de otra empresa NO puede ver ticket ajeno", () => {
    expect(puedeVerTicket(user2, ticketDeUser1)).toBe(false);
  });

  it("usuario1 NO puede ver ticket de usuario2 aunque sea misma empresa destino", () => {
    // La función solo comprueba creadorId — si no es creador, no puede ver
    const ticketEmpDest1 = {
      ...ticketDeUser2,
      destinos: [{ empresaId: "emp-1" }] // destino es emp-1 pero creador es user-2
    };
    expect(puedeVerTicket(user1, ticketEmpDest1)).toBe(false);
  });
});

// ─── puedeEditarTicket ───────────────────────────────────────────────────────

describe("puedeEditarTicket", () => {
  it("admin puede editar cualquier ticket", () => {
    expect(puedeEditarTicket(admin, ticketDeUser2)).toBe(true);
  });

  it("creador puede editar su ticket", () => {
    expect(puedeEditarTicket(user1, ticketDeUser1)).toBe(true);
  });

  it("usuario de la empresa origen puede editar", () => {
    // user1 es de emp-1, el ticket tiene empresaOrigenId = emp-1
    expect(puedeEditarTicket(user1, ticketDeUser1)).toBe(true);
  });

  it("usuario de empresa destino puede editar", () => {
    // user1 de emp-1 puede editar ticket cuyo destino incluye emp-1
    const ticketConDestinoEmp1 = {
      ...ticketDeUser2,
      destinos: [{ empresaId: "emp-1" }]
    };
    expect(puedeEditarTicket(user1, ticketConDestinoEmp1)).toBe(true);
  });

  it("usuario sin relación con el ticket NO puede editar", () => {
    expect(puedeEditarTicket(user2, ticketDeUser1)).toBe(false);
  });

  it("ticket sin destinos — usuario de otra empresa no puede editar", () => {
    const ticketSinDestinos = {
      empresaOrigenId: "emp-1",
      creadorId: "user-1",
      estado: "ABIERTO" as const,
      destinos: []
    };
    expect(puedeEditarTicket(user2, ticketSinDestinos)).toBe(false);
  });
});

// ─── puedeEditarComentario ────────────────────────────────────────────────────

describe("puedeEditarComentario", () => {
  it("admin puede editar cualquier comentario", () => {
    expect(puedeEditarComentario(admin, { autorId: "user-99" })).toBe(true);
  });

  it("autor puede editar su propio comentario", () => {
    expect(puedeEditarComentario(user1, { autorId: "user-1" })).toBe(true);
  });

  it("otro usuario no puede editar comentario ajeno", () => {
    expect(puedeEditarComentario(user2, { autorId: "user-1" })).toBe(false);
  });
});

// ─── puedeMoverEstado ────────────────────────────────────────────────────────

describe("puedeMoverEstado", () => {
  it("admin siempre puede mover estado", () => {
    expect(puedeMoverEstado(admin, { asignadoId: null })).toBe(true);
    expect(puedeMoverEstado(admin, { asignadoId: "otro-user" })).toBe(true);
  });

  it("usuario asignado puede mover estado", () => {
    expect(puedeMoverEstado(user1, { asignadoId: "user-1" })).toBe(true);
  });

  it("usuario NO asignado no puede mover estado", () => {
    expect(puedeMoverEstado(user2, { asignadoId: "user-1" })).toBe(false);
  });

  it("sin asignado — usuario normal no puede mover estado", () => {
    expect(puedeMoverEstado(user1, { asignadoId: null })).toBe(false);
  });
});

// ─── puedeEliminarTicket ──────────────────────────────────────────────────────

describe("puedeEliminarTicket", () => {
  it("solo admin puede eliminar", () => {
    expect(puedeEliminarTicket({ rol: "ADMIN" })).toBe(true);
    expect(puedeEliminarTicket({ rol: "USER" })).toBe(false);
  });
});

// ─── Escenarios combinados ────────────────────────────────────────────────────

describe("escenarios reales combinados", () => {
  it("ticket de emp-1 asignado al admin: el admin puede verlo, editarlo y moverlo", () => {
    const ticket = ticketAsignadoAAdmin;
    expect(puedeVerTicket(admin, ticket)).toBe(true);
    expect(puedeEditarTicket(admin, ticket)).toBe(true);
    expect(puedeMoverEstado(admin, ticket)).toBe(true);
  });

  it("user-2 no tiene ningún acceso a ticket de emp-1", () => {
    expect(puedeVerTicket(user2, ticketDeUser1)).toBe(false);
    expect(puedeEditarTicket(user2, ticketDeUser1)).toBe(false);
    expect(puedeMoverEstado(user2, ticketDeUser1)).toBe(false);
  });

  it("el creador puede ver y editar pero no mover estado si no está asignado", () => {
    const ticket = { ...ticketDeUser1, asignadoId: null };
    expect(puedeVerTicket(user1, ticket)).toBe(true);
    expect(puedeEditarTicket(user1, ticket)).toBe(true);
    expect(puedeMoverEstado(user1, ticket)).toBe(false);
  });
});
