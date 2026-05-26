import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";

export default async function NuevoTicketPage() {
  const user = await requireCurrentPageUser();

  const [empresas, categoriasCustom] = await Promise.all([
    prisma.empresa.findMany({
      // Excluir la propia empresa del usuario — el origen ya es automáticamente la suya
      where: { isActive: true, isGlobalTarget: false, deletedAt: null, NOT: { id: user.empresaId } },
      select: { id: true, nombre: true, dominio: true, color: true },
      orderBy: { nombre: "asc" }
    }),
    prisma.ticketCategoriaCustom.findMany({ select: { nombre: true }, orderBy: { nombre: "asc" } })
  ]);

  return <NewTicketForm empresas={empresas} categoriasCustom={categoriasCustom.map((item) => item.nombre)} />;
}

