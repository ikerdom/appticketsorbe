import Link from "next/link";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Histórico de tickets resueltos</h1>
        <Link className="rounded-md border px-3 py-2 text-sm" href={`/api/admin/export?${params.toString()}`}>
          Exportar CSV
        </Link>
      </div>

      <form className="grid gap-3 rounded-2xl border bg-card p-3 md:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="Buscar título, descripción o solución…" className="h-10 rounded-md border px-3 text-sm" />
        <select name="empresa" defaultValue={empresa} className="h-10 rounded-md border px-3 text-sm">
          <option value="">Empresa</option>
          {empresas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>
        <select name="prioridad" defaultValue={prioridad} className="h-10 rounded-md border px-3 text-sm">
          <option value="">Prioridad</option>
          <option value="BAJA">BAJA</option>
          <option value="MEDIA">MEDIA</option>
          <option value="ALTA">ALTA</option>
          <option value="CRITICA">CRÍTICA</option>
        </select>
        <input name="categoria" defaultValue={categoria} placeholder="Categoría" className="h-10 rounded-md border px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
          <input type="checkbox" name="soloConSolucion" value="1" defaultChecked={soloConSolucion} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />
          Solo tickets con solución documentada
        </label>
        <button className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground md:col-span-2" type="submit">
          Aplicar filtros
        </button>
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
