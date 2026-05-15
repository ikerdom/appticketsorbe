import { NextRequest, NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/data";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentAdmin = await requireAdmin();
    const body = await request.json();
    const rol: Rol = body.rol === "ADMIN" ? "ADMIN" : "USER";

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, rol: true } });
    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (target.rol === "ADMIN" && rol === "USER") {
      const adminCount = await prisma.user.count({ where: { rol: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Debe haber al menos un administrador en el sistema." }, { status: 400 });
      }
    }

    if (currentAdmin.id === target.id && rol !== "ADMIN") {
      return NextResponse.json({ error: "No puedes quitarte tu propio rol de administrador." }, { status: 400 });
    }

    const usuario = await prisma.user.update({
      where: { id: params.id },
      data: { rol }
    });

    return NextResponse.json({ usuario });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}
