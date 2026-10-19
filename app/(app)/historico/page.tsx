import Link from "next/link";
import { BookOpen, Download, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { HistoricoTable } from "@/components/tickets/historico-table";

type Search = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HistoricoPage({ searchParams }: { searchParams: Search }) {
  const user = await requireCurrentPageUser();
  if (user.rol !== "ADMIN") {
    return (
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">No tienes permiso para acceder al histórico.</p>
      </div>
    );
  }

  const q = asString(searchParams.q)?.trim() || "";
  const empresa = asString(searchParams.empresa) || "";
  const prioridad = asString(searchParams.prioridad) || "";
  const categoria = asString(searchParams.categoria) || "";
  const soloConSolucion = asString(searchParams.soloConSolucion) === "1";

  // Histórico REAL: todos los resueltos, archivados o no. El filtro
  // archivadoAt:null hacía "desaparecer" tickets a los 7 días (auto-archive).
  const and: Prisma.TicketWhereInput[] = [{ estado: "RESUELTO" }];
  if (soloConSolucion) and.push({ notaResolucion: { not: null } });
  if (empresa) and.push({ destinos: { some: { empresaId: empresa } } });
  if (prioridad) and.push({ prioridad: prioridad as any });
  if (categoria) {
    and.push({
      OR: [{ categoria: categoria as any }, { categoriaCustom: { contains: categoria, mode: "insensitive" } }]
    });
  }
  if (q) {
    and.push({
      OR: [
        { titulo: { contains: q, mode: "insensitive" } },
        { descripcion: { contains: q, mode: "insensitive" } },
        { notaResolucion: { contains: q, mode: "insensitive" } }
      ]
    });
  }

  const [tickets, empresas] = await Promise.all([
    prisma.ticket.findMany({
      where: { AND: and },
      include: {
        empresaDestino: { select: { nombre: true } },
        creador: { select: { email: true, nombre: true, name: true } }
      },
      orderBy: { resueltoAt: "desc" },
      take: 500
    }),
    prisma.empresa.findMany({
      where: { isActive: true, isGlobalTarget: false, deletedAt: null },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" }
    })
  ]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (empresa) params.set("empresa", empresa);
  if (prioridad) params.set("prioridad", prioridad);
  if (categoria) params.set("categoria", categoria);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Histórico</h1>
          <p className="text-sm text-slate-500">Tickets resueltos — base de conocimiento del equipo</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
            href={`/api/admin/export?${params.toString()}`}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Link>
        </div>
      </div>

      <form className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar título, descripción o solución…"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
            />
          </div>
          <select
            name="empresa"
            defaultValue={empresa}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <select
            name="prioridad"
            defaultValue={prioridad}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
          >
            <option value="">Todas las prioridades</option>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              name="soloConSolucion"
              value="1"
              defaultChecked={soloConSolucion}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            Solo con solución documentada
          </label>
          <button
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            type="submit"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar
          </button>
        </div>
      </form>

      <HistoricoTable
        items={tickets.map((ticket) => ({
          ...ticket,
          notaResolucion: ticket.notaResolucion ?? null,
          resueltoAt: ticket.resueltoAt?.toISOString() ?? null,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString()
        }))}
      />
    </div>
  );
}
