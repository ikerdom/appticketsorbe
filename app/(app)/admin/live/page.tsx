import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { AdminLiveRoom, type LiveTicket } from "@/components/admin/admin-live-room";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sala de operaciones · Live" };

export default async function AdminLivePage() {
  const user = await requireCurrentPageUser();
  if (user.rol !== "ADMIN") redirect("/forbidden");

  // Initial data (client will poll from here)
  const [tickets, usuarios, empresas] = await Promise.all([
    prisma.ticket.findMany({
      where: { archivadoAt: null, estado: { in: ["ABIERTO", "EN_CURSO"] } },
      select: {
        id: true,
        numero: true,
        titulo: true,
        estado: true,
        prioridad: true,
        createdAt: true,
        updatedAt: true,
        asignadoId: true,
        empresaOrigen: { select: { id: true, nombre: true, color: true } },
        destinos: {
          select: { empresa: { select: { id: true, nombre: true, color: true, isGlobalTarget: true } } }
        },
        asignado: { select: { id: true, nombre: true, name: true, email: true } },
        creador: { select: { id: true, nombre: true, name: true, email: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.user.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, name: true, email: true },
      orderBy: { email: "asc" }
    }),
    prisma.empresa.findMany({
      where: { isActive: true, deletedAt: null, isGlobalTarget: false },
      select: { id: true, nombre: true, color: true },
      orderBy: { nombre: "asc" }
    })
  ]);

  const PRIORIDAD_ORDER: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
  tickets.sort((a, b) => {
    const pa = PRIORIDAD_ORDER[a.prioridad] ?? 9;
    const pb = PRIORIDAD_ORDER[b.prioridad] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const initialStats = {
    total: tickets.length,
    abiertos: tickets.filter((t) => t.estado === "ABIERTO").length,
    enCurso: tickets.filter((t) => t.estado === "EN_CURSO").length,
    criticos: tickets.filter((t) => t.prioridad === "CRITICA").length,
    sinAsignar: tickets.filter((t) => !t.asignadoId).length,
    slaVencidos: tickets.filter((t) => {
      const horas = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
      return horas > 72;
    }).length
  };

  return (
    <AdminLiveRoom
      initialTickets={tickets as LiveTicket[]}
      initialStats={initialStats}
      usuarios={usuarios}
      empresas={empresas}
      currentUserId={user.id}
    />
  );
}
