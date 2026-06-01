import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";

/** GET — admin: all notes for this ticket. user: empty array (notes are admin-only). */
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();

    // Non-admins get empty array — notes are internal admin only
    if (user.rol !== "ADMIN") return NextResponse.json({ notas: [] });

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const notas = await prisma.notaTicket.findMany({
      where: { ticketId: params.id },
      include: { autor: { select: { id: true, email: true, nombre: true, name: true } } },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ notas });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las notas" }, { status: 400 });
  }
}

/** POST — admin only. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo los administradores pueden añadir notas internas." }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as { contenido?: string };
    if (!body.contenido?.trim()) {
      return NextResponse.json({ error: "La nota no puede estar vacía" }, { status: 400 });
    }

    const nota = await prisma.notaTicket.create({
      data: {
        contenido: body.contenido.trim(),
        ticketId: params.id,
        autorId: user.id,
        esAdmin: true
      },
      include: { autor: { select: { id: true, email: true, nombre: true, name: true } } }
    });

    return NextResponse.json({ nota });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la nota" }, { status: 400 });
  }
}

/** DELETE — admin only. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as { notaId?: string };
    if (!body.notaId) return NextResponse.json({ error: "notaId requerido" }, { status: 400 });

    const nota = await prisma.notaTicket.findUnique({ where: { id: body.notaId } });
    if (!nota || nota.ticketId !== params.id) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    await prisma.notaTicket.delete({ where: { id: body.notaId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la nota" }, { status: 400 });
  }
}
