import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

const patchSchema = z.object({
  estado: z.enum(["PENDIENTE", "EN_CURSO", "HECHO"]).optional(),
  titulo: z.string().min(2).optional(),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  asignadoId: z.string().optional().nullable(),
  contactoNombre: z.string().optional().nullable(),
  contactoTelefono: z.string().optional().nullable()
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();

    const tarea = await prisma.tarea.findUnique({ where: { id: params.id } });
    if (!tarea) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const canEdit = user.rol === "ADMIN" || tarea.empresaId === user.empresaId;
    if (!canEdit) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = patchSchema.parse(await request.json());

    const updated = await prisma.tarea.update({
      where: { id: params.id },
      data: {
        ...body,
        resueltoAt: body.estado === "HECHO" ? (tarea.resueltoAt ?? new Date()) : body.estado ? null : undefined
      },
      include: {
        empresa: { select: { id: true, nombre: true, color: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true } }
      }
    });

    return NextResponse.json({ tarea: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();

    const tarea = await prisma.tarea.findUnique({ where: { id: params.id } });
    if (!tarea) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    if (user.rol !== "ADMIN") return NextResponse.json({ error: "Solo administradores pueden eliminar" }, { status: 403 });

    await prisma.tarea.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 400 });
  }
}
