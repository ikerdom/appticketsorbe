import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

const createSchema = z.object({
  titulo: z.string().min(3, "Título obligatorio"),
  descripcion: z.string().min(10, "Descripción obligatoria"),
  autorNombre: z.string().min(2, "Nombre obligatorio"),
  autorEmail: z.string().email().optional().or(z.literal("")),
  autorTelefono: z.string().optional()
});

export async function GET(_request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    const where = user.rol === "ADMIN" ? {} : { userId: user.id };

    const propuestas = await prisma.propuesta.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true, color: true } },
        user: { select: { id: true, email: true, nombre: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ propuestas });
  } catch {
    return NextResponse.json({ error: "Error al cargar propuestas" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const data = createSchema.parse(body);

    const propuesta = await prisma.propuesta.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        autorNombre: data.autorNombre,
        autorEmail: data.autorEmail || null,
        autorTelefono: data.autorTelefono?.trim() || null,
        estado: "PENDIENTE",
        empresaId: user.empresaId,
        userId: user.id
      },
      include: {
        empresa: { select: { id: true, nombre: true, color: true } },
        user: { select: { id: true, email: true, nombre: true, name: true } }
      }
    });

    return NextResponse.json({ propuesta }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar la propuesta" }, { status: 400 });
  }
}
