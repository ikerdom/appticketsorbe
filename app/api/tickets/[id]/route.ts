import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editarTicketSchema } from "@/lib/validations";
import { puedeEditarTicket, puedeEliminarTicket, puedeVerTicket } from "@/lib/permisos";
import { requireCurrentUser } from "@/lib/data";
import { logTicketAction } from "@/lib/audit";
import { sendTicketNotification } from "@/lib/notifications";
import { sanitizeRichText } from "@/lib/sanitize-html";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        empresaOrigen: true,
        empresaDestino: true,
        destinos: { include: { empresa: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true, image: true } },
        comentarios: {
          include: { autor: { select: { id: true, email: true, nombre: true, name: true } } },
          orderBy: { createdAt: "asc" }
        },
        adjuntos: true,
        historial: {
          include: { autor: { select: { id: true, email: true, nombre: true, name: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el ticket" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true, nombre: true } } } } }
    });
    if (!ticket) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    if (user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo un administrador puede editar el ticket." }, { status: 403 });
    }

    // Edición simultánea permitida — sin hard-lock (solo informativo)
    const body = await request.json();
    const data = editarTicketSchema.parse(body);
    // sanitizeRichText es idempotente sobre texto plano legacy (sin tags que quitar)
    const descripcionSaneada = data.descripcion !== undefined ? sanitizeRichText(data.descripcion) : undefined;

    const prevAsignadoId = ticket.asignadoId;

    const updated = await prisma.$transaction(async (tx) => {
      const edited = await tx.ticket.update({
        where: { id: params.id },
        data: {
          titulo: data.titulo,
          descripcion: descripcionSaneada,
          personaAfectada: data.personaAfectada,
          contactoNombre: data.contactoNombre,
          contactoTelefono: data.contactoTelefono,
          contactoEmail: data.contactoEmail,
          contactoReferencia: data.contactoReferencia,
          contactoNotas: data.contactoNotas,
          prioridad: data.prioridad,
          categoria: data.categoria,
          categoriaCustom: data.categoriaCustom,
          asignadoId: data.asignadoId === undefined ? undefined : data.asignadoId
        }
      });

      if (data.destinatarios?.length) {
        await tx.ticketEmpresaDestino.deleteMany({ where: { ticketId: edited.id } });
        await tx.ticketEmpresaDestino.createMany({
          data: data.destinatarios.map((empresaId) => ({ ticketId: edited.id, empresaId })),
          skipDuplicates: true
        });
        await tx.ticket.update({ where: { id: edited.id }, data: { empresaDestinoId: data.destinatarios[0] } });
      }

      return edited;
    });

    await logTicketAction({
      ticketId: updated.id,
      autorId: user.id,
      accion: "TICKET_EDITADO",
      detalle: data
    });

    if (data.prioridad && data.prioridad !== ticket.prioridad) {
      await logTicketAction({
        ticketId: updated.id,
        autorId: user.id,
        accion: "PRIORIDAD_CAMBIADA",
        detalle: { de: ticket.prioridad, a: data.prioridad }
      });
    }

    if (updated.asignadoId && updated.asignadoId !== prevAsignadoId) {
      // updated.asignadoId ya es el id que necesitamos — sin findUnique de más solo para confirmarlo
      const empresaNombre = ticket.destinos.find((destino) => !destino.empresa.isGlobalTarget)?.empresa.nombre ?? "Incidencia";
      await sendTicketNotification({
        toUserIds: [updated.asignadoId],
        tipo: "asignado",
        ticketId: updated.id,
        ticketNumero: updated.numero,
        titulo: updated.titulo,
        mensaje: "Se te ha asignado este ticket.",
        empresaNombre
      });
      await logTicketAction({
        ticketId: updated.id,
        autorId: user.id,
        accion: "TICKET_ASIGNADO",
        detalle: { asignadoId: updated.asignadoId }
      });
    }

    return NextResponse.json({ ticket: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    if (!puedeEliminarTicket(user)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await logTicketAction({
      ticketId: ticket.id,
      autorId: user.id,
      accion: "TICKET_ELIMINADO"
    });
    await prisma.ticket.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 400 });
  }
}
