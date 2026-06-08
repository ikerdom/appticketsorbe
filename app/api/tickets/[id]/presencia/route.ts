import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { puedeVerTicket } from "@/lib/permisos";
import { presenceCutoffDate } from "@/lib/realtime";

async function ensureAccess(ticketId: string) {
  const user = await requireCurrentUser();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
  });
  if (!ticket || !puedeVerTicket(user, ticket)) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) } as const;
  }
  return { user, ticket } as const;
}

async function fetchViewers(ticketId: string) {
  const cutoff = presenceCutoffDate();
  await prisma.ticketPresencia.deleteMany({
    where: { ticketId, lastSeenAt: { lt: cutoff } }
  });

  return prisma.ticketPresencia.findMany({
    where: { ticketId, lastSeenAt: { gte: cutoff } },
    include: {
      usuario: { select: { id: true, email: true, nombre: true, name: true, image: true } }
    },
    orderBy: { lastSeenAt: "desc" }
  });
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await ensureAccess(params.id);
    if ("error" in access) return access.error;

    const viewers = await fetchViewers(params.id);
    return NextResponse.json({
      viewers: viewers.map((item) => ({
        id: item.usuario.id,
        email: item.usuario.email,
        nombre: item.usuario.nombre ?? item.usuario.name ?? null,
        image: item.usuario.image,
        lastSeenAt: item.lastSeenAt
      }))
    });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar presencia" }, { status: 400 });
  }
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await ensureAccess(params.id);
    if ("error" in access) return access.error;

    await prisma.ticketPresencia.upsert({
      where: {
        ticketId_usuarioId: {
          ticketId: params.id,
          usuarioId: access.user.id
        }
      },
      update: {},
      create: {
        ticketId: params.id,
        usuarioId: access.user.id
      }
    });

    const viewers = await fetchViewers(params.id);
    return NextResponse.json({
      viewers: viewers.map((item) => ({
        id: item.usuario.id,
        email: item.usuario.email,
        nombre: item.usuario.nombre ?? item.usuario.name ?? null,
        image: item.usuario.image,
        lastSeenAt: item.lastSeenAt
      }))
    });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar presencia" }, { status: 400 });
  }
}
