import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB — base64 adds 33%, mismo límite que /api/tickets/[id]/adjuntos

/**
 * Sube una imagen ANTES de que exista el ticket — para el editor rico del
 * formulario de creación (R8). El adjunto queda "huérfano" (ticketId null)
 * hasta que POST /api/tickets lo asocia al ticket recién creado, buscando
 * en la descripción qué ids de /api/adjuntos/{id} aparecen referenciados.
 */
export async function POST(request: NextRequest) {
  try {
    await requireCurrentUser(); // cualquier usuario autenticado puede empezar a crear un ticket

    const body = (await request.json()) as { filename?: string; tipo?: string; base64?: string };
    const { filename = "imagen.png", tipo = "image/png", base64 } = body;

    if (!base64) {
      return NextResponse.json({ error: "Sin datos de imagen." }, { status: 400 });
    }
    if (!tipo.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes." }, { status: 400 });
    }

    const buffer = Buffer.from(base64, "base64");
    if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Imagen demasiado grande (máx 3 MB). Recorta o comprime antes de pegar." }, { status: 400 });
    }

    const adjunto = await prisma.adjunto.create({
      data: {
        nombre: filename,
        tipo,
        tamano: buffer.byteLength,
        url: `data:${tipo};base64,${base64}`,
        ticketId: null
      }
    });

    return NextResponse.json({ adjunto }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 400 });
  }
}
