import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { puedeVerTicket } from "@/lib/permisos";
import { requireCurrentUser } from "@/lib/data";
import { sendTicketNotification } from "@/lib/notifications";
import { logTicketAction } from "@/lib/audit";

type TicketAction = "set_estado" | "take" | "resolve" | "reopen" | "archive";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as {
      action?: TicketAction;
      estado?: "ABIERTO" | "EN_CURSO" | "RESUELTO";
      horasDedicadas?: number;
      notaResolucion?: string;
    };

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const action = body.action ?? "set_estado";
    const isAdmin = user.rol === "ADMIN";

    // Resolved tickets are permanent — no state changes except archiving
    if (ticket.estado === "RESUELTO" && action !== "archive") {
      return NextResponse.json({ error: "Un ticket resuelto no puede cambiar de estado." }, { status: 403 });
    }

    let data: Record<string, unknown> = {};
    let accionHistorial = "ESTADO_CAMBIADO";
    let detalle: Record<string, unknown> = { de: ticket.estado };

    if (action === "take") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Solo un administrador puede marcar un ticket en curso." }, { status: 403 });
      }
      data = { asignadoId: user.id, estado: "EN_CURSO", resueltoAt: null };
      accionHistorial = "TICKET_COGIDO";
      detalle = { de: ticket.estado, a: "EN_CURSO", asignadoId: user.id };
    } else if (action === "resolve") {
      data = {
        estado: "RESUELTO",
        resueltoAt: new Date(),
        ...(body.horasDedicadas != null ? { horasDedicadas: body.horasDedicadas } : {}),
        ...(body.notaResolucion ? { notaResolucion: body.notaResolucion } : {})
      };
      accionHistorial = "ESTADO_CAMBIADO";
      detalle = { de: ticket.estado, a: "RESUELTO", horasDedicadas: body.horasDedicadas, notaResolucion: body.notaResolucion };
    } else if (action === "reopen") {
      data = { estado: "ABIERTO", resueltoAt: null };
      accionHistorial = "ESTADO_CAMBIADO";
      detalle = { de: ticket.estado, a: "ABIERTO" };
    } else if (action === "archive") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Solo un administrador puede cerrar (archivar)." }, { status: 403 });
      }
      data = { archivadoAt: new Date() };
      accionHistorial = "TICKET_ARCHIVADO";
      detalle = { estado: ticket.estado };
    } else {
      const estado = body.estado;
      if (!estado) {
        return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
      }

      if (estado === "EN_CURSO") {
        if (!isAdmin) {
          return NextResponse.json({ error: "Solo un administrador puede marcar un ticket en curso." }, { status: 403 });
        }
        data = { estado, asignadoId: ticket.asignadoId ?? user.id, resueltoAt: null };
      } else if (estado === "ABIERTO") {
        data = { estado, asignadoId: null, resueltoAt: null };
      } else {
        data = { estado, resueltoAt: new Date() };
      }
      accionHistorial = "ESTADO_CAMBIADO";
      detalle = { de: ticket.estado, a: estado };
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data
    });

    await logTicketAction({
      ticketId: updated.id,
      autorId: user.id,
      accion: accionHistorial,
      detalle
    });

    const recipients = new Set<string>();
    if (ticket.creadorId !== user.id) recipients.add(ticket.creadorId);
    if (updated.asignadoId && updated.asignadoId !== user.id) recipients.add(updated.asignadoId);

    await sendTicketNotification({
      toUserIds: Array.from(recipients),
      tipo: "estado_cambiado",
      ticketId: updated.id,
      ticketNumero: updated.numero,
      titulo: updated.titulo,
      mensaje: `El estado del ticket ha cambiado a ${updated.estado.replace("_", " ")}.`
    });

    return NextResponse.json({ ticket: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo cambiar el estado" }, { status: 400 });
  }
}
