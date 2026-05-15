import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { AdminEmpresasTable } from "@/components/tickets/admin-empresas-table";

export default async function AdminEmpresasPage() {
  const user = await requireCurrentPageUser();
  if (user.rol !== "ADMIN") {
    redirect("/forbidden");
  }

  const empresas = await prisma.empresa.findMany({
    where: { isActive: true, deletedAt: null, isGlobalTarget: false },
    select: {
      id: true,
      nombre: true,
      dominio: true,
      color: true,
      logoUrl: true,
      descripcionCorta: true,
      _count: {
        select: {
          usuarios: true,
          ticketsOrigen: true,
          ticketsDestino: true
        }
      }
    },
    orderBy: { nombre: "asc" }
  });

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Administración de empresas</h1>
      <AdminEmpresasTable empresas={empresas} />
    </section>
  );
}
