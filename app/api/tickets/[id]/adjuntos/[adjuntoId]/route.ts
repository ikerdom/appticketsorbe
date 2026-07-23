import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { puedeVerTicket } from "@/lib/permisos";
import { requireCurrentUser } from "@/lib/data";
import { serveAdjunto } from "@/lib/adjunto-serve";

export async function GET(_request: NextRequest, { params }: { params: { id: string; adjuntoId: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return new NextResponse("No autorizado", { status: 403 });
    }

    const adjunto = await prisma.adjunto.findUnique({
      where: { id: params.adjuntoId },
      select: { url: true, nombre: true, tipo: true, ticketId: true }
    });
    if (!adjunto || adjunto.ticketId !== ticket.id) {
      return new NextResponse("No encontrado", { status: 404 });
    }

    return serveAdjunto(adjunto);
  } catch {
    return new NextResponse("Error", { status: 400 });
  }
}
