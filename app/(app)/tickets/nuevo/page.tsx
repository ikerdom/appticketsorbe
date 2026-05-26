import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";

export default async function NuevoTicketPage() {
  const user = await requireCurrentPageUser();
  const isAdmin = user.rol === "ADMIN";

  const [empresas, categoriasCustom] = await Promise.all([
    prisma.empresa.findMany({
      where: { isActive: true, isGlobalTarget: false, deletedAt: null },
      select: { id: true, nombre: true, dominio: true, color: true },
      orderBy: { nombre: "asc" }
    }),
    prisma.ticketCategoriaCustom.findMany({ select: { nombre: true }, orderBy: { nombre: "asc" } })
  ]);

  return (
    <NewTicketForm
      empresas={empresas}
      categoriasCustom={categoriasCustom.map((item) => item.nombre)}
      currentEmpresaId={user.empresaId}
      currentEmpresaNombre={user.empresa.nombre}
      currentEmpresaColor={user.empresa.color}
      isAdmin={isAdmin}
    />
  );
}

