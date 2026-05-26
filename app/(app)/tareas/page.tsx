import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { TareasBoard } from "@/components/tareas/tareas-board";

export const metadata: Metadata = {
  title: "Notas internas"
};

export default async function TareasPage() {
  const user = await requireCurrentPageUser();
  const isAdmin = user.rol === "ADMIN";

  // Notas privadas: cada usuario solo ve las suyas. Admin ve todas.
  const [tareas, usuarios] = await Promise.all([
    prisma.tarea.findMany({
      where: isAdmin ? {} : { creadorId: user.id },
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notas internas</h1>
        <p className="text-sm text-slate-500">
          {isAdmin ? "Todas las notas · vista admin" : "Solo tú puedes ver tus notas"}
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
