import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser, visibleTicketWhere } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ticketUnreadMap } from "@/lib/lecturas";

export const metadata: Metadata = {
  title: "Tickets de Incidencia"
};

export default async function DashboardPage() {
  const user = await requireCurrentPageUser();

  const [tickets, empresas, usuarios] = await Promise.all([
    prisma.ticket.findMany({
      where: visibleTicketWhere(user),
      include: {
        empresaOrigen: true,
        empresaDestino: true,
        destinos: { include: { empresa: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true, image: true } },
        _count: { select: { comentarios: true } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.empresa.findMany({
      where: { isGlobalTarget: false, isActive: true, deletedAt: null },
      select: { id: true, nombre: true, color: true, isActive: true },
      orderBy: [{ nombre: "asc" }]
    }),
    prisma.user.findMany({
      select: { id: true, email: true, nombre: true, name: true, empresaId: true, image: true },
      where: { activo: true, ...(user.rol === "ADMIN" ? {} : { empresaId: user.empresaId }) },
      orderBy: { email: "asc" }
    })
  ]);

  const unread = await ticketUnreadMap(
    tickets.map((t) => t.id),
    { id: user.id, rol: user.rol }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets de Incidencia</h1>
        </div>
        <Link href="/tickets/nuevo" className="hidden md:block">
          <Button>Crear incidencia</Button>
        </Link>
      </div>

      <KanbanBoard
        initialTickets={tickets.map((ticket) => ({ ...ticket, unread: unread[ticket.id] ?? false }))}
        empresas={empresas}
        usuarios={usuarios}
        isAdmin={user.rol === "ADMIN"}
        currentUserId={user.id}
        currentUserEmpresaId={user.empresaId}
      />

      <Link href="/tickets/nuevo" className="fixed bottom-5 right-5 z-40 md:hidden" aria-label="Crear incidencia">
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
          <Plus className="h-6 w-6" />
        </button>
      </Link>
    </div>
  );
}
