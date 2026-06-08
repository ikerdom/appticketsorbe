import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeEditarTicket, puedeVerTicket } from "@/lib/permisos";
import { nextEditLockExpiry } from "@/lib/realtime";

async function ensureTicket(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
  });
  return ticket;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await ensureTicket(params.id);
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.ticketEdicion.deleteMany({ where: { ticketId: params.id, expiresAt: { lt: new Date() } } });

    const lock = await prisma.ticketEdicion.findUnique({
      where: { ticketId: params.id },
      include: { usuario: { select: { id: true, email: true, nombre: true, name: true } } }
    });

    return NextResponse.json({
      lock: lock
        ? {
            usuarioId: lock.usuarioId,
            nombre: lock.usuario.nombre ?? lock.usuario.name ?? lock.usuario.email,
            email: lock.usuario.email,
            expiresAt: lock.expiresAt
          }
        : null
    });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar edición" }, { status: 400 });
  }
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await ensureTicket(params.id);
    if (!ticket || !puedeEditarTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.ticketEdicion.deleteMany({ where: { ticketId: params.id, expiresAt: { lt: new Date() } } });

    const current = await prisma.ticketEdicion.findUnique({
      where: { ticketId: params.id },
      include: { usuario: { select: { id: true, email: true, nombre: true, name: true } } }
    });

    if (current && current.usuarioId !== user.id) {
      return NextResponse.json(
        {
          error: `Este ticket está siendo editado por ${current.usuario.nombre ?? current.usuario.name ?? current.usuario.email}.`,
          lock: {
            usuarioId: current.usuarioId,
            nombre: current.usuario.nombre ?? current.usuario.name ?? current.usuario.email,
            email: current.usuario.email,
            expiresAt: current.expiresAt
          }
        },
        { status: 409 }
      );
    }

    const lock = await prisma.ticketEdicion.upsert({
      where: { ticketId: params.id },
      update: { expiresAt: nextEditLockExpiry(), usuarioId: user.id },
      create: { ticketId: params.id, usuarioId: user.id, expiresAt: nextEditLockExpiry() },
      include: { usuario: { select: { id: true, email: true, nombre: true, name: true } } }
    });

    return NextResponse.json({
      lock: {
        usuarioId: lock.usuarioId,
        nombre: lock.usuario.nombre ?? lock.usuario.name ?? lock.usuario.email,
        email: lock.usuario.email,
        expiresAt: lock.expiresAt
      }
    });
  } catch {
    return NextResponse.json({ error: "No se pudo tomar el bloqueo de edición" }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await ensureTicket(params.id);
    if (!ticket || !puedeEditarTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.ticketEdicion.deleteMany({ where: { ticketId: params.id, usuarioId: user.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo liberar el bloqueo" }, { status: 400 });
  }
}
