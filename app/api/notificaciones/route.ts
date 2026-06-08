import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { usuarioId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit
      }),
      prisma.notification.count({ where: { usuarioId: user.id, leida: false } })
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch {
    return NextResponse.json({ items: [], unreadCount: 0 }, { status: 400 });
  }
}

export async function PATCH() {
  try {
    const user = await requireCurrentUser();
    await prisma.notification.updateMany({
      where: { usuarioId: user.id, leida: false },
      data: { leida: true }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudieron marcar notificaciones" }, { status: 400 });
  }
}
