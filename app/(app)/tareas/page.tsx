import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { TareasBoard } from "@/components/tareas/tareas-board";

export const metadata: Metadata = {
  title: "Tickets internos"
};

export default async function TareasPage() {
  const user = await requireCurrentPageUser();
  const isAdmin = user.rol === "ADMIN";

  const [tareas, usuarios] = await Promise.all([
    prisma.tarea.findMany({
      where: isAdmin ? {} : { empresaId: user.empresaId },
      include: {
        empresa: { select: { id: true, nombre: true, color: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.user.findMany({
      where: { activo: true, ...(isAdmin ? {} : { empresaId: user.empresaId }) },
      select: { id: true, email: true, nombre: true, name: true },
      orderBy: { email: "asc" }
    })
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tickets</h1>
        <p className="text-sm text-slate-500">
          {isAdmin ? "Gestión de tickets · todas las empresas" : "Tickets de tu equipo"}
        </p>
      </div>
      <TareasBoard
        initialTareas={tareas}
        isAdmin={isAdmin}
        currentUserId={user.id}
        usuarios={usuarios}
      />
    </div>
  );
}
