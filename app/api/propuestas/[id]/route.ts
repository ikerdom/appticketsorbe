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

    const previa = await prisma.propuesta.findUnique({ where: { id: params.id } });
    if (!previa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const updated = await prisma.propuesta.update({
      where: { id: params.id },
      data: body
    });

    // Notificación in-app al autor cuando el admin cambia estado o responde
    if (previa.userId && previa.userId !== user.id) {
      let mensaje: string | null = null;
      if (body.estado && body.estado !== previa.estado) {
        const textos: Record<string, string> = {
          REVISADA: `Tu propuesta "${previa.titulo}" está siendo revisada`,
          ACEPTADA: `✅ Tu propuesta "${previa.titulo}" ha sido aceptada`,
          DESCARTADA: `Tu propuesta "${previa.titulo}" ha sido descartada`
        };
        mensaje = textos[body.estado] ?? null;
      } else if (body.notaAdmin && body.notaAdmin !== previa.notaAdmin) {
        mensaje = `Nueva respuesta a tu propuesta "${previa.titulo}"`;
      }
      if (mensaje) {
        await prisma.notification.create({
          data: { tipo: "PROPUESTA_ESTADO", mensaje, usuarioId: previa.userId }
        }).catch(() => null); // la notificación nunca debe romper el update
      }
    }

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

    const esAutor = propuesta.userId === user.id;
    if (user.rol !== "ADMIN") {
      if (!esAutor) return NextResponse.json({ error: "Solo puedes retirar tus propias propuestas" }, { status: 403 });
      if (propuesta.estado !== "PENDIENTE") {
        return NextResponse.json({ error: "Ya está siendo revisada — solo se pueden retirar propuestas pendientes" }, { status: 403 });
      }
    }

    await prisma.propuesta.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 400 });
  }
}
