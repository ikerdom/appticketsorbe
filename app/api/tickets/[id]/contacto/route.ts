import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";
import { logTicketAction } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });

    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as {
      contactoNombre?: string;
      contactoTelefono?: string;
      contactoEmail?: string;
      contactoReferencia?: string;
      contactoNotas?: string;
    };

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        contactoNombre: body.contactoNombre?.trim() || null,
        contactoTelefono: body.contactoTelefono?.trim() || null,
        contactoEmail: body.contactoEmail?.trim().toLowerCase() || null,
        contactoReferencia: body.contactoReferencia?.trim() || null,
        contactoNotas: body.contactoNotas?.trim() || null
      }
    });

    await logTicketAction({
      ticketId: updated.id,
      autorId: user.id,
      accion: "CONTACTO_EDITADO",
      detalle: {
        contactoNombre: updated.contactoNombre,
        contactoTelefono: updated.contactoTelefono,
        contactoEmail: updated.contactoEmail,
        contactoReferencia: updated.contactoReferencia
      }
    });

    return NextResponse.json({ ticket: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el contacto" }, { status: 400 });
  }
}
