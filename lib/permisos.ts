import { Rol, Ticket, User } from "@prisma/client";

type TicketViewShape = Pick<Ticket, "empresaOrigenId" | "creadorId" | "asignadoId" | "estado"> & {
  destinos?: Array<{ empresaId: string; empresa?: { isGlobalTarget?: boolean | null } | null }>;
};

export function esAdmin(user: Pick<User, "rol">) {
  return user.rol === Rol.ADMIN;
}

export function puedeVerTicket(user: Pick<User, "rol" | "empresaId">, ticket: TicketViewShape) {
  if (user.rol === Rol.ADMIN) return true;
  if (ticket.empresaOrigenId === user.empresaId) return true;
  return ticket.destinos?.some((destino) => destino.empresaId === user.empresaId) ?? false;
}

export function puedeEditarTicket(user: Pick<User, "id" | "rol">, ticket: Pick<Ticket, "creadorId" | "estado">) {
  if (user.rol === Rol.ADMIN) return true;
  return ticket.creadorId === user.id && ticket.estado === "ABIERTO";
}

export function puedeMoverEstado(user: Pick<User, "id" | "rol">, ticket: Pick<Ticket, "asignadoId">) {
  if (user.rol === Rol.ADMIN) return true;
  return ticket.asignadoId === user.id;
}

export function puedeEliminarTicket(user: Pick<User, "rol">) {
  return user.rol === Rol.ADMIN;
}
