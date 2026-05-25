import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        archivadoAt: null,
        estado: { in: ["ABIERTO", "EN_CURSO"] }
      },
      select: {
        id: true,
        numero: true,
        titulo: true,
        estado: true,
        prioridad: true,
        createdAt: true,
        updatedAt: true,
        asignadoId: true,
        empresaOrigen: { select: { id: true, nombre: true, color: true } },
        destinos: {
          select: { empresa: { select: { id: true, nombre: true, color: true, isGlobalTarget: true } } }
        },
        asignado: { select: { id: true, nombre: true, name: true, email: true } },
        creador: { select: { id: true, nombre: true, name: true, email: true } }
      },
      orderBy: [
        {
          prioridad: "desc"
        },
        { createdAt: "asc" }
      ]
    });

    // Sort CRITICA → ALTA → MEDIA → BAJA manually since Prisma desc on enum isn't guaranteed
    const PRIORIDAD_ORDER: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
    tickets.sort((a, b) => {
      const pa = PRIORIDAD_ORDER[a.prioridad] ?? 9;
      const pb = PRIORIDAD_ORDER[b.prioridad] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const stats = {
      total: tickets.length,
      abiertos: tickets.filter((t) => t.estado === "ABIERTO").length,
      enCurso: tickets.filter((t) => t.estado === "EN_CURSO").length,
      criticos: tickets.filter((t) => t.prioridad === "CRITICA").length,
      sinAsignar: tickets.filter((t) => !t.asignadoId).length,
      slaVencidos: tickets.filter((t) => {
        const horas = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
        return horas > 72;
      }).length
    };

    return NextResponse.json({ tickets, stats, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Error al cargar datos live" }, { status: 500 });
  }
}
