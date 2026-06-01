import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { formatRelativeEs } from "@/lib/dates";

export const metadata = { title: "Notas internas" };

export default async function AdminNotasPage() {
  const user = await requireCurrentPageUser();
  if (user.rol !== "ADMIN") redirect("/forbidden");

  const notas = await prisma.notaTicket.findMany({
    where: { esAdmin: true },
    include: {
      autor: { select: { id: true, email: true, nombre: true, name: true } },
      ticket: { select: { id: true, numero: true, titulo: true, estado: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const ESTADO_BADGE: Record<string, string> = {
    ABIERTO: "bg-blue-100 text-blue-700",
    EN_CURSO: "bg-amber-100 text-amber-700",
    RESUELTO: "bg-emerald-100 text-emerald-700"
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🔒 Notas internas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo visibles para administradores · {notas.length} nota{notas.length !== 1 ? "s" : ""}
        </p>
      </div>

      {notas.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          No hay notas internas todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => {
            const autorName = nota.autor.nombre || nota.autor.name || nota.autor.email;
            return (
              <div key={nota.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    🔒 {autorName}
                  </span>
                  <Link
                    href={`/tickets/${nota.ticket.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition"
                  >
                    #{String(nota.ticket.numero).padStart(4, "0")} · {nota.ticket.titulo}
                  </Link>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_BADGE[nota.ticket.estado] ?? "bg-slate-100 text-slate-600"}`}>
                    {nota.ticket.estado.replace("_", " ")}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">{formatRelativeEs(nota.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">{nota.contenido}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
