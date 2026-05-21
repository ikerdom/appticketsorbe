import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser, visibleTicketWhere } from "@/lib/data";
import { AdminEmpresasPanel } from "@/components/layout/admin-empresas-panel";
import { UserPortal } from "@/components/portal/user-portal";
import { ticketUnreadMap } from "@/lib/lecturas";

export const metadata: Metadata = {
  title: "Incidencia"
};

export default async function DashboardPage() {
  const user = await requireCurrentPageUser();
  const isAdmin = user.rol === "ADMIN";

  const [tickets, empresas, usuarios, tareas, propuestas] = await Promise.all([
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
    }),
    // tareas sólo para usuarios normales (admin tiene su propia página)
    isAdmin ? [] : prisma.tarea.findMany({
      where: { empresaId: user.empresaId },
      include: {
        empresa: { select: { id: true, nombre: true, color: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    // propuestas del usuario
    isAdmin ? [] : prisma.propuesta.findMany({
      where: { userId: user.id },
      include: { empresa: { select: { id: true, nombre: true, color: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const unread = await ticketUnreadMap(
    tickets.map((t) => t.id),
    { id: user.id, rol: user.rol }
  );

  const ticketsWithUnread = tickets.map((t) => ({ ...t, unread: unread[t.id] ?? false }));

  if (isAdmin) {
    const empresaStats = empresas.map((empresa) => {
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
    }).filter((e) => e.total > 0);

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel de incidencias</h1>
          <p className="text-sm text-slate-500">Vista de administrador · todas las empresas</p>
        </div>
        <AdminEmpresasPanel
          empresas={empresaStats}
          allTickets={ticketsWithUnread}
          empresasList={empresas}
          usuarios={usuarios}
          currentUserId={user.id}
          currentUserEmpresaId={user.empresaId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hola, {user.nombre ?? user.name ?? user.email}
        </h1>
        <p className="text-sm text-slate-500">{user.empresa.nombre}</p>
      </div>
      <UserPortal
        tickets={ticketsWithUnread}
        tareas={tareas}
        propuestas={propuestas}
        currentUserId={user.id}
        usuarios={usuarios}
        empresaNombre={user.empresa.nombre ?? ""}
        autorNombre={user.nombre ?? user.name ?? user.email ?? ""}
        autorEmail={user.email ?? ""}
      />
    </div>
  );
}
