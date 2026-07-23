import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serveAdjunto } from "@/lib/adjunto-serve";

// Sin auth — mismo modelo de seguridad que /public/tickets/[id]: quien tiene
// el enlace del ticket ya puede ver todos sus datos, incluidas las imágenes.
export async function GET(_request: NextRequest, { params }: { params: { id: string; adjuntoId: string } }) {
  try {
    const adjunto = await prisma.adjunto.findUnique({
      where: { id: params.adjuntoId },
      select: { url: true, nombre: true, tipo: true, ticketId: true }
    });
    if (!adjunto || adjunto.ticketId !== params.id) {
      return new NextResponse("No encontrado", { status: 404 });
    }

    return serveAdjunto(adjunto);
  } catch {
    return new NextResponse("Error", { status: 400 });
  }
}
