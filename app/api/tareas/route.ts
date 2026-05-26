import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

const createSchema = z.object({
  titulo: z.string().min(2, "Título obligatorio"),
  descripcion: z.string().optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA"),
  asignadoId: z.string().optional().nullable(),
  contactoNombre: z.string().optional().nullable(),
  contactoTelefono: z.string().optional().nullable()
});

export async function GET(_request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    // Notas privadas: cada usuario solo ve las suyas; admin ve todas
    const where = user.rol === "ADMIN" ? {} : { creadorId: user.id };

    const tareas = await prisma.tarea.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true, color: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({ tareas });
  } catch {
    return NextResponse.json({ error: "Error al cargar tareas" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const data = createSchema.parse(body);

    const tarea = await prisma.tarea.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion?.trim() || null,
        prioridad: data.prioridad,
        estado: "PENDIENTE",
        empresaId: user.empresaId,
        creadorId: user.id,
        asignadoId: data.asignadoId || null,
        contactoNombre: data.contactoNombre?.trim() || null,
        contactoTelefono: data.contactoTelefono?.trim() || null
      },
      include: {
        empresa: { select: { id: true, nombre: true, color: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true } }
      }
    });

    return NextResponse.json({ tarea }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la tarea" }, { status: 400 });
  }
}
