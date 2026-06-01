import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

/** GET /api/admin/notas — all internal notes across all tickets, admin only. */
export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const notas = await prisma.notaTicket.findMany({
      where: { esAdmin: true },
      include: {
        autor: { select: { id: true, email: true, nombre: true, name: true } },
        ticket: { select: { id: true, numero: true, titulo: true, estado: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ notas });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las notas" }, { status: 400 });
  }
}
