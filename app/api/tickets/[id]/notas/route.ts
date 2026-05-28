import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";

/** GET — returns notes visible to the current user:
 *  - ADMIN: all notes where esAdmin=true, plus their own private notes
 *  - USER:  only their own notes (esAdmin=false, autorId=me)
 */
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const isAdmin = user.rol === "ADMIN";

    const notas = await prisma.notaTicket.findMany({
      where: {
        ticketId: params.id,
        ...(isAdmin
          ? { OR: [{ esAdmin: true }, { autorId: user.id }] }
          : { autorId: user.id })
      },
      include: { autor: { select: { id: true, email: true, nombre: true, name: true } } },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ notas });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las notas" }, { status: 400 });
  }
}

/** POST — create a note.
 *  - ADMIN: esAdmin=true (shared with other admins)
 *  - USER:  esAdmin=false (private)
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
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

    const isAdmin = user.rol === "ADMIN";

    const nota = await prisma.notaTicket.create({
      data: {
        contenido: body.contenido.trim(),
        ticketId: params.id,
        autorId: user.id,
        esAdmin: isAdmin
      },
      include: { autor: { select: { id: true, email: true, nombre: true, name: true } } }
    });

    return NextResponse.json({ nota });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la nota" }, { status: 400 });
  }
}

/** DELETE — only the author (or any admin) can delete a note */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as { notaId?: string };
    if (!body.notaId) {
      return NextResponse.json({ error: "notaId requerido" }, { status: 400 });
    }

    const nota = await prisma.notaTicket.findUnique({ where: { id: body.notaId } });
    if (!nota || nota.ticketId !== params.id) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const isAdmin = user.rol === "ADMIN";
    if (!isAdmin && nota.autorId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.notaTicket.delete({ where: { id: body.notaId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la nota" }, { status: 400 });
  }
}
