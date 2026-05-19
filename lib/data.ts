import { Prisma, Rol } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionDbUser } from "@/lib/auth-session";

export async function getCurrentDbUser() {
  return getSessionDbUser();
}

export async function requireCurrentUser() {
  const user = await getCurrentDbUser();
  if (!user || !user.activo) {
    throw new Error("No autenticado");
  }
  return user;
}

export async function requireCurrentPageUser() {
  const user = await getCurrentDbUser();
  if (!user || !user.activo) {
    redirect("/login?error=invalid_session");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireCurrentUser();
  if (user.rol !== Rol.ADMIN) {
    throw new Error("No autorizado");
  }
  return user;
}

export function visibleTicketWhere(user: { rol: Rol; empresaId: string }): Prisma.TicketWhereInput {
  if (user.rol === Rol.ADMIN) return { archivadoAt: null };
  return {
    archivadoAt: null,
    OR: [
      { empresaOrigenId: user.empresaId },
      { empresaDestinoId: user.empresaId },
      { destinos: { some: { empresaId: user.empresaId } } }
    ]
  };
}

export async function getEmpresasActivas() {
  return prisma.empresa.findMany({
    where: { isActive: true, isGlobalTarget: false, deletedAt: null },
    orderBy: { nombre: "asc" }
  });
}

export async function getAssignableUsers(forEmpresaIds?: string[]) {
  return prisma.user.findMany({
    where: {
      activo: true,
      empresaId: forEmpresaIds?.length ? { in: forEmpresaIds } : undefined
    },
    select: { id: true, email: true, nombre: true, name: true, empresaId: true, rol: true },
    orderBy: { email: "asc" }
  });
}
