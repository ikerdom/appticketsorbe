import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser, visibleTicketWhere } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { AdminEmpresasPanel } from "@/components/layout/admin-empresas-panel";
import { ticketUnreadMap } from "@/lib/lecturas";

export const metadata: Metadata = {
  title: "Tickets de Incidencia"
};

export default async function DashboardPage() {
  const user = await requireCurrentPageUser();
  const isAdmin = user.rol === "ADMIN";

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
      where: { activo: true, ...(isAdmin ? {} : { empresaId: user.empresaId }) },
      orderBy: { email: "asc" }
    })
  ]);

  const unread = await ticketUnreadMap(
    tickets.map((t) => t.id),
    { id: user.id, rol: user.rol }
  );

  // Admin: resumen por empresa
  const empresaStats = isAdmin
    ? empresas.map((empresa) => {
        const propios = tickets.filter((t) =>
          t.empresaOrigenId === empresa.id || t.destinos.some((d) => d.empresaId === empresa.id)
        );
        return {
          ...empresa,
          abiertos: propios.filter((t) => t.estado === "ABIERTO").length,
          enCurso: propios.filter((t) => t.estado === "EN_CURSO").length,
          resueltos: propios.filter((t) => t.estado === "RESUELTO").length,
          total: propios.length
        };
      }).filter((e) => e.total > 0)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? "Panel de incidencias" : "Mis incidencias"}
          </h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? "Vista de administrador · todas las empresas" : user.empresa.nombre}
          </p>
        </div>
        <Link href="/tickets/nuevo" className="hidden md:block">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva incidencia
          </Button>
        </Link>
      </div>

      {isAdmin && empresaStats.length > 0 ? (
        <AdminEmpresasPanel
          empresas={empresaStats}
          allTickets={tickets.map((t) => ({ ...t, unread: unread[t.id] ?? false }))}
          empresasList={empresas}
          usuarios={usuarios}
          currentUserId={user.id}
          currentUserEmpresaId={user.empresaId}
        />
      ) : (
        <>
          <KanbanBoard
            initialTickets={tickets.map((ticket) => ({ ...ticket, unread: unread[ticket.id] ?? false }))}
            empresas={empresas}
            usuarios={usuarios}
            isAdmin={false}
            currentUserId={user.id}
            currentUserEmpresaId={user.empresaId}
          />
          <Link href="/tickets/nuevo" className="fixed bottom-5 right-5 z-40 md:hidden" aria-label="Crear incidencia">
            <button className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl">
              <Plus className="h-6 w-6" />
            </button>
          </Link>
        </>
      )}
    </div>
  );
}
