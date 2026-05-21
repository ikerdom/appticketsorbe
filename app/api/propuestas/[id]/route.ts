import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

const patchSchema = z.object({
  estado: z.enum(["PENDIENTE", "REVISADA", "ACEPTADA", "DESCARTADA"]).optional(),
  notaAdmin: z.string().optional().nullable()
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const body = patchSchema.parse(await request.json());

    const updated = await prisma.propuesta.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json({ propuesta: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();

    const propuesta = await prisma.propuesta.findUnique({ where: { id: params.id } });
    if (!propuesta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const canDelete = user.rol === "ADMIN" || propuesta.userId === user.id;
    if (!canDelete) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await prisma.propuesta.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 400 });
  }
}
