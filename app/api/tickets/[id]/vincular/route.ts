import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";
import { logTicketAction } from "@/lib/audit";

// POST /api/tickets/[id]/vincular  { parentNumero: number }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const body = await request.json();
    const parentNumero = Number(body.parentNumero);
    if (!parentNumero || isNaN(parentNumero)) return NextResponse.json({ error: "Número de ticket inválido" }, { status: 400 });

    const [hijo, padre] = await Promise.all([
      prisma.ticket.findUnique({ where: { id: params.id }, select: { id: true, numero: true, parentId: true, estado: true } }),
      prisma.ticket.findUnique({ where: { numero: parentNumero }, select: { id: true, numero: true, parentId: true, estado: true } })
    ]);

    if (!hijo) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    if (!padre) return NextResponse.json({ error: `No existe el ticket #${parentNumero}` }, { status: 404 });
    if (padre.id === hijo.id) return NextResponse.json({ error: "Un ticket no puede vincularse a sí mismo" }, { status: 400 });
    if (padre.parentId) return NextResponse.json({ error: "El ticket padre ya tiene un padre — solo se permiten 2 niveles" }, { status: 400 });

    // Al vincular, el hijo hereda el estado del padre para coherencia
    const updated = await prisma.ticket.update({
      where: { id: hijo.id },
      data: { parentId: padre.id, estado: padre.estado }
    });

    await logTicketAction({ ticketId: hijo.id, autorId: user.id, accion: "vinculado", detalle: { parentNumero, parentId: padre.id } });

    return NextResponse.json({ ok: true, parentId: updated.parentId });
  } catch (error) {
    console.error(`[POST /api/tickets/${params.id}/vincular]`, error);
    return NextResponse.json({ error: "Error al vincular" }, { status: 500 });
  }
}

// DELETE /api/tickets/[id]/vincular
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id }, select: { id: true, parentId: true } });
    if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    if (!ticket.parentId) return NextResponse.json({ error: "No tiene ticket padre" }, { status: 400 });

    await prisma.ticket.update({ where: { id: ticket.id }, data: { parentId: null } });
    await logTicketAction({ ticketId: ticket.id, autorId: user.id, accion: "desvinculado" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[DELETE /api/tickets/${params.id}/vincular]`, error);
    return NextResponse.json({ error: "Error al desvincular" }, { status: 500 });
  }
}
