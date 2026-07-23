import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";
import { serveAdjunto } from "@/lib/adjunto-serve";

/**
 * Sirve un adjunto por su id, sin pasar por un ticketId en la URL — hace
 * falta durante la creación de ticket (R8), donde la imagen se sube y se
 * referencia inline en el editor antes de que el ticket exista.
 *
 * Permiso: si el adjunto ya está asociado a un ticket, se aplica el mismo
 * check que el resto de la app (puedeVerTicket). Si sigue huérfano
 * (ticketId null — recién subido, ticket aún sin crear), basta con estar
 * autenticado: el id es un cuid no adivinable y el adjunto solo vive un
 * momento hasta que su ticket se crea.
 */
export async function GET(_request: NextRequest, { params }: { params: { adjuntoId: string } }) {
  try {
    const user = await requireCurrentUser();

    const adjunto = await prisma.adjunto.findUnique({
      where: { id: params.adjuntoId },
      include: {
        ticket: {
          select: {
            creadorId: true,
            empresaOrigenId: true,
            asignadoId: true,
            estado: true,
            destinos: { select: { empresaId: true, empresa: { select: { isGlobalTarget: true } } } }
          }
        }
      }
    });
    if (!adjunto) {
      return new NextResponse("No encontrado", { status: 404 });
    }
    if (adjunto.ticket && !puedeVerTicket(user, adjunto.ticket)) {
      return new NextResponse("No autorizado", { status: 403 });
    }

    return serveAdjunto(adjunto);
  } catch {
    return new NextResponse("Error", { status: 400 });
  }
}
