import { subDays, startOfDay } from "date-fns";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { AdminDashboardView } from "@/components/tickets/admin-dashboard-view";

export default async function AdminDashboardPage({
  searchParams
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const user = await requireCurrentPageUser();
  if (user.rol !== "ADMIN") redirect("/forbidden");

  const range = searchParams.range === "90" ? 90 : 30;
  const from = startOfDay(subDays(new Date(), range));
  const previousFrom = startOfDay(subDays(from, range));

  const empresas = await prisma.empresa.findMany({
    where: { isActive: true, deletedAt: null, isGlobalTarget: false },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" }
  });
  const empresaMap = new Map(empresas.map((empresa) => [empresa.id, empresa.nombre]));

  const [estadoGroup, prevEstadoGroup, origenGroup, destinoGroup, topCategoriasEnum, topCategoriasCustom, resueltos, sinAsignar, ticketsTrend, prioridadGroup] =
    await Promise.all([
      prisma.ticket.groupBy({ by: ["estado"], where: { archivadoAt: null, createdAt: { gte: from } }, _count: { estado: true } }),
      prisma.ticket.groupBy({ by: ["estado"], where: { archivadoAt: null, createdAt: { gte: previousFrom, lt: from } }, _count: { estado: true } }),
      prisma.ticket.groupBy({
        by: ["empresaOrigenId"],
        where: { archivadoAt: null, createdAt: { gte: from } },
        _count: { empresaOrigenId: true }
      }),
      prisma.ticket.findMany({
        where: { archivadoAt: null, createdAt: { gte: from } },
        select: { destinos: { select: { empresaId: true, empresa: { select: { nombre: true, isGlobalTarget: true } } } } }
      }),
      prisma.ticket.groupBy({
        by: ["categoria"],
        where: { archivadoAt: null, createdAt: { gte: from } },
        _count: { categoria: true },
        orderBy: { _count: { categoria: "desc" } },
        take: 5
      }),
      prisma.ticket.groupBy({
        by: ["categoriaCustom"],
        where: { archivadoAt: null, createdAt: { gte: from }, categoriaCustom: { not: null } },
        _count: { categoriaCustom: true },
        orderBy: { _count: { categoriaCustom: "desc" } },
        take: 5
      }),
      prisma.ticket.findMany({ where: { archivadoAt: null, resueltoAt: { not: null } }, include: { empresaOrigen: true } }),
      prisma.ticket.findMany({
        where: {
          archivadoAt: null,
          asignadoId: null,
          estado: { in: ["ABIERTO", "EN_CURSO"] },
          createdAt: { lte: subDays(new Date(), 2) }
        },
        include: { destinos: { include: { empresa: true } } },
        orderBy: { createdAt: "asc" }
      }),
      prisma.ticket.findMany({
        where: { archivadoAt: null, createdAt: { gte: from } },
        select: { createdAt: true }
      }),
      prisma.ticket.groupBy({
        by: ["prioridad"],
        where: { archivadoAt: null, createdAt: { gte: from } },
        _count: { prioridad: true }
      })
    ]);

  const estado = { ABIERTO: 0, EN_CURSO: 0, RESUELTO: 0 };
  const estadoPrev = { ABIERTO: 0, EN_CURSO: 0, RESUELTO: 0 };
  for (const item of estadoGroup) estado[item.estado] = item._count.estado;
  for (const item of prevEstadoGroup) estadoPrev[item.estado] = item._count.estado;

  const comparePct = (current: number, previous: number) => {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const origen = origenGroup.map((group) => ({
    nombre: empresaMap.get(group.empresaOrigenId) || group.empresaOrigenId,
    total: group._count.empresaOrigenId
  }));

  const destinationCounts = new Map<string, number>();
  for (const row of destinoGroup) {
    for (const destino of row.destinos) {
      if (destino.empresa.isGlobalTarget) continue;
      destinationCounts.set(destino.empresa.nombre, (destinationCounts.get(destino.empresa.nombre) ?? 0) + 1);
    }
  }
  const destino = Array.from(destinationCounts.entries()).map(([nombre, total]) => ({ nombre, total }));

  const avgGlobalHoras =
    resueltos.length === 0
      ? 0
      : resueltos.reduce((acc, ticket) => acc + (ticket.resueltoAt!.getTime() - ticket.createdAt.getTime()) / 3600000, 0) / resueltos.length;

  const byEmpresa = new Map<string, number[]>();
  for (const ticket of resueltos) {
    const key = ticket.empresaOrigen.nombre;
    const diff = (ticket.resueltoAt!.getTime() - ticket.createdAt.getTime()) / 3600000;
    byEmpresa.set(key, [...(byEmpresa.get(key) || []), diff]);
  }
  const avgPorEmpresa = Array.from(byEmpresa.entries()).map(([empresa, values]) => ({
    empresa,
    horas: values.reduce((a, b) => a + b, 0) / values.length
  }));

  const priority = prioridadGroup.map((item) => ({ prioridad: item.prioridad, total: item._count.prioridad }));

  const topCategorias = [
    ...topCategoriasEnum.map((item) => ({ categoria: item.categoria, total: item._count.categoria })),
    ...topCategoriasCustom
      .filter((item) => item.categoriaCustom)
      .map((item) => ({ categoria: item.categoriaCustom as string, total: item._count.categoriaCustom }))
  ]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const trendMap = new Map<string, number>();
  for (const ticket of ticketsTrend) {
    const key = ticket.createdAt.toISOString().slice(0, 10);
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([fecha, total]) => ({ fecha, total }));

  const exportQuery = new URLSearchParams(
    Object.entries(searchParams).filter(([, value]) => typeof value === "string") as [string, string][]
  ).toString();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard de administración</h1>
      <AdminDashboardView
        data={{
          estado,
          estadoPrev,
          comparePct: {
            ABIERTO: comparePct(estado.ABIERTO, estadoPrev.ABIERTO),
            EN_CURSO: comparePct(estado.EN_CURSO, estadoPrev.EN_CURSO),
            RESUELTO: comparePct(estado.RESUELTO, estadoPrev.RESUELTO)
          },
          origen,
          destino,
          topCategorias,
          prioridad: priority,
          trend,
          sinAsignar: sinAsignar.map((ticket) => ({
            id: ticket.id,
            numero: ticket.numero,
            titulo: ticket.titulo,
            createdAt: ticket.createdAt.toISOString(),
            empresaDestino: ticket.destinos.filter((d) => !d.empresa.isGlobalTarget).map((d) => d.empresa.nombre).join(", ")
          })),
          avgGlobalHoras,
          avgPorEmpresa,
          exportQuery,
          empresas,
          range
        }}
      />
    </section>
  );
}

