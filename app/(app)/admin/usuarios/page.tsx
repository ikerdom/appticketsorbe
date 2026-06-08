import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { AdminUsersTable } from "@/components/tickets/admin-users-table";

export default async function AdminUsuariosPage() {
  const user = await requireCurrentPageUser();
  if (user.rol !== "ADMIN") {
    redirect("/forbidden");
  }

  const usuarios = await prisma.user.findMany({
    where: { activo: true, NOT: { email: "usuario.eliminado@system.local" } },
    include: {
      empresa: { select: { id: true, nombre: true, dominio: true, color: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const empresas = await prisma.empresa.findMany({
    where: { isActive: true, deletedAt: null, isGlobalTarget: false },
    select: { id: true, nombre: true, dominio: true, color: true },
    orderBy: { nombre: "asc" }
  });

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Administración de usuarios</h1>
      <AdminUsersTable usuarios={usuarios} empresas={empresas} />
    </section>
  );
}

