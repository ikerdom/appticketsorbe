import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ESTADO_LABELS, ESTADO_COLOR, PRIORIDAD_LABELS, PRIORIDAD_COLOR } from "@/lib/constants";
import { formatDateTimeEs, formatRelativeEs } from "@/lib/dates";
import { PublicTicketGallery } from "@/components/tickets/public-ticket-gallery";
import { RichContent } from "@/components/ui/rich-content";
import { extractReferencedAdjuntoIds } from "@/lib/rich-content";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: { numero: true, titulo: true }
  });
  if (!ticket) return { title: "Ticket no encontrado" };
  return { title: `Ticket #${String(ticket.numero).padStart(4, "0")} — ${ticket.titulo}` };
}

const ESTADO_DOT: Record<string, string> = {
  ABIERTO: "bg-blue-500",
  EN_CURSO: "bg-amber-500",
  BLOQUEADO: "bg-red-500",
  RESUELTO: "bg-emerald-500"
};

export default async function PublicTicketPage({ params }: Props) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: {
      numero: true,
      titulo: true,
      descripcion: true,
      estado: true,
      prioridad: true,
      categoria: true,
      categoriaCustom: true,
      notaResolucion: true,
      motivoBloqueo: true,
      createdAt: true,
      updatedAt: true,
      resueltoAt: true,
      empresaOrigen: { select: { nombre: true, color: true } },
      destinos: {
        include: { empresa: { select: { nombre: true, color: true, isGlobalTarget: true } } }
      },
      comentarios: {
        select: {
          contenido: true,
          createdAt: true,
          autor: { select: { nombre: true, name: true, rol: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      adjuntos: {
        select: { id: true, nombre: true, tipo: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!ticket) notFound();

  const numero = String(ticket.numero).padStart(4, "0");
  const empresasAfectadas = ticket.destinos
    .filter((d) => !d.empresa.isGlobalTarget)
    .map((d) => d.empresa);

  const estadoColor = ESTADO_COLOR[ticket.estado];
  const prioridadColor = PRIORIDAD_COLOR[ticket.prioridad];
  const estadoDot = ESTADO_DOT[ticket.estado] ?? "bg-slate-400";

  const referencedAdjuntoIds = extractReferencedAdjuntoIds([ticket.descripcion, ...ticket.comentarios.map((c) => c.contenido)]);
  const orphanAdjuntos = ticket.adjuntos.filter((a) => !referencedAdjuntoIds.has(a.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">A</div>
            <span className="text-sm font-semibold text-slate-800">AppTickets</span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">Vista pública · solo lectura</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">

        {/* Número, título y badges */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="mb-2 font-mono text-xs text-slate-400 tracking-wide">INCIDENCIA #{numero}</p>
          <h1 className="mb-4 text-xl font-bold leading-snug text-slate-900">{ticket.titulo}</h1>

          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${estadoColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${estadoDot}`} />
              {ESTADO_LABELS[ticket.estado]}
            </span>
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${prioridadColor}`}>
              {PRIORIDAD_LABELS[ticket.prioridad]}
            </span>
            {empresasAfectadas.map((e, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: e.color ?? "#64748b" }}
              >
                {e.nombre}
              </span>
            ))}
          </div>
        </div>

        {/* Banner BLOQUEADO */}
        {ticket.estado === "BLOQUEADO" && ticket.motivoBloqueo && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-600">Incidencia bloqueada</p>
            <p className="text-sm leading-relaxed text-red-800 whitespace-pre-wrap">{ticket.motivoBloqueo}</p>
          </div>
        )}

        {/* Descripción */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Descripción del problema</p>
          <RichContent html={ticket.descripcion} publicTicketId={params.id} />
        </div>

        {/* Capturas adjuntas */}
        <PublicTicketGallery ticketId={params.id} adjuntos={orphanAdjuntos} />

        {/* Nota de resolución */}
        {ticket.notaResolucion && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <span>✓</span> Cómo se resolvió
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-900">{ticket.notaResolucion}</p>
          </div>
        )}

        {/* Fechas */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Fechas</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Creado</p>
              <p className="font-medium text-slate-700">{formatDateTimeEs(ticket.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Última actualización</p>
              <p className="font-medium text-slate-700">{formatRelativeEs(ticket.updatedAt)}</p>
            </div>
            {ticket.resueltoAt && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Resuelto</p>
                <p className="font-medium text-emerald-700">{formatDateTimeEs(ticket.resueltoAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Conversación */}
        {ticket.comentarios.length > 0 && (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Conversación · {ticket.comentarios.length} mensaje{ticket.comentarios.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {ticket.comentarios.map((c, i) => {
                const isAdmin = c.autor.rol === "ADMIN";
                const autorName = c.autor.nombre ?? c.autor.name ?? (isAdmin ? "Soporte" : "Usuario");
                const initials = autorName.slice(0, 2).toUpperCase();
                return (
                  <div key={i} className={`px-5 py-4 ${isAdmin ? "bg-indigo-50/50" : "bg-white"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${isAdmin ? "bg-indigo-500" : "bg-slate-400"}`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-slate-800">{autorName}</span>
                          {isAdmin && (
                            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Soporte</span>
                          )}
                          <span className="text-[11px] text-slate-400">{formatRelativeEs(c.createdAt)}</span>
                        </div>
                        <RichContent html={c.contenido} compact className="text-slate-700" publicTicketId={params.id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          AppTickets · Sistema interno de gestión de incidencias · <span className="font-mono">{numero}</span>
        </p>
      </div>
    </div>
  );
}
