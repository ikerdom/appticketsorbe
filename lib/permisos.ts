import { Rol, Ticket, User } from "@prisma/client";

type TicketViewShape = Pick<Ticket, "empresaOrigenId" | "creadorId" | "asignadoId" | "estado"> & {
  destinos?: Array<{ empresaId: string; empresa?: { isGlobalTarget?: boolean | null } | null }>;
};

type TicketEditShape = Pick<Ticket, "creadorId" | "estado" | "empresaOrigenId"> & {
  destinos?: Array<{ empresaId: string }>;
};

export function esAdmin(user: Pick<User, "rol">) {
  return user.rol === Rol.ADMIN;
}

export function puedeVerTicket(user: Pick<User, "id" | "rol" | "empresaId">, ticket: TicketViewShape & { creadorId: string }) {
  if (user.rol === Rol.ADMIN) return true;
  return ticket.creadorId === user.id;
}

/**
 * Admin siempre puede editar.
 * Usuario normal puede editar si pertenece a la empresa que creó el ticket
 * o a alguna empresa destino (afectada). El creador también puede.
 * No se restringe por estado: si pueden verlo, pueden editarlo.
 */
export function puedeEditarTicket(
  user: Pick<User, "id" | "rol" | "empresaId">,
  ticket: TicketEditShape
) {
  if (user.rol === Rol.ADMIN) return true;
  if (ticket.creadorId === user.id) return true;
  if (ticket.empresaOrigenId === user.empresaId) return true;
  return ticket.destinos?.some((d) => d.empresaId === user.empresaId) ?? false;
}

export function puedeEditarComentario(
  user: Pick<User, "id" | "rol">,
  comentario: { autorId: string }
) {
  if (user.rol === Rol.ADMIN) return true;
  return comentario.autorId === user.id;
}

export function puedeMoverEstado(user: Pick<User, "id" | "rol">, ticket: Pick<Ticket, "asignadoId">) {
  if (user.rol === Rol.ADMIN) return true;
  return ticket.asignadoId === user.id;
}

export function puedeEliminarTicket(user: Pick<User, "rol">) {
  return user.rol === Rol.ADMIN;
}
