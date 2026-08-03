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
          autor: { select: { nombre: true, name: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      // Sin url: son data: URLs de varios MB — el cliente las pide a demanda
      // vía /api/public/tickets/[id]/adjuntos/[adjuntoId] en vez de recibirlas en el HTML.
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

  // Igual que en la vista autenticada: la galería plana solo enseña
  // imágenes huérfanas (de antes del editor rico) — las inline ya se ven
  // en su sitio dentro de descripción/comentarios.
  const referencedAdjuntoIds = extractReferencedAdjuntoIds([ticket.descripcion, ...ticket.comentarios.map((c) => c.contenido)]);
  const orphanAdjuntos = ticket.adjuntos.filter((a) => !referencedAdjuntoIds.has(a.id));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header mínimo */}
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">AppTickets</span>
          <span className="text-xs text-slate-400">Vista pública · solo lectura</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Número y título */}
        <div>
          <p className="mb-1 text-xs font-mono text-slate-400">#{numero}</p>
          <h1 className="text-xl font-bold text-slate-900">{ticket.titulo}</h1>
        </div>

        {/* Badges de estado y prioridad */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${estadoColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              ticket.estado === "ABIERTO" ? "bg-blue-500" :
              ticket.estado === "EN_CURSO" ? "bg-amber-500" : "bg-emerald-500"
            }`} />
            {ESTADO_LABELS[ticket.estado]}
          </span>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${prioridadColor}`}>
            {PRIORIDAD_LABELS[ticket.prioridad]}
          </span>
        </div>

        {/* Empresas afectadas */}
        {empresasAfectadas.length > 0 && (
          <div className="rounded-xl border bg-white p-4">
            <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Empresa afectada</p>
            <div className="flex flex-wrap gap-2">
              {empresasAfectadas.map((e, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: e.color ?? "#64748b" }}
                >
                  {e.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Descripción</p>
          <RichContent html={ticket.descripcion} publicTicketId={params.id} />
        </div>

        {/* Capturas adjuntas — solo huérfanas, las inline ya se ven en el texto */}
        <PublicTicketGallery ticketId={params.id} adjuntos={orphanAdjuntos} />

        {/* Fechas */}
        <div className="rounded-xl border bg-white p-4 grid grid-cols-2 gap-4 text-sm">
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

        {/* Comentarios públicos */}
        {ticket.comentarios.length > 0 && (
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Comentarios ({ticket.comentarios.length})
            </p>
            {ticket.comentarios.map((c, i) => (
              <div key={i} className="border-t pt-3 first:border-t-0 first:pt-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {c.autor.nombre ?? c.autor.name ?? "Usuario"}
                  </span>
                  <span className="text-xs text-slate-400">{formatRelativeEs(c.createdAt)}</span>
                </div>
                <RichContent html={c.contenido} compact className="text-slate-600" publicTicketId={params.id} />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          AppTickets · Sistema interno de gestión de incidencias
        </p>
      </div>
    </div>
  );
}
