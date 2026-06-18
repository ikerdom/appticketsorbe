import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { puedeVerTicket } from "@/lib/permisos";
import { requireCurrentUser } from "@/lib/data";
import { logTicketAction } from "@/lib/audit";

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const IS_VERCEL = Boolean(process.env.VERCEL);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCurrentUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { destinos: { include: { empresa: { select: { isGlobalTarget: true } } } } }
    });
    if (!ticket || !puedeVerTicket(user, ticket)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    // ── JSON path: base64 image from clipboard paste ──────────────────────────
    if (contentType.includes("application/json")) {
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
        return NextResponse.json({ error: "Imagen demasiado grande (máx 4MB)." }, { status: 400 });
      }

      const dataUrl = `data:${tipo};base64,${base64}`;

      const adjunto = await prisma.adjunto.create({
        data: {
          nombre: filename,
          tipo,
          tamano: buffer.byteLength,
          url: dataUrl,
          ticketId: ticket.id
        }
      });

      await logTicketAction({
        ticketId: ticket.id,
        autorId: user.id,
        accion: "ADJUNTO_SUBIDO",
        detalle: { total: 1, tipo }
      });

      return NextResponse.json({ adjuntos: [adjunto] }, { status: 201 });
    }

    // ── FormData path: file upload (local dev only) ────────────────────────────
    if (IS_VERCEL) {
      return NextResponse.json(
        { error: "En producción usa el pegado de imágenes desde el portapapeles." },
        { status: 501 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const saved = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: `${file.name} supera el límite de 4MB.` }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const buf = Buffer.from(bytes);
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(path.join(uploadDir, safeName), buf);

      const adjunto = await prisma.adjunto.create({
        data: {
          nombre: file.name,
          tipo: file.type || "application/octet-stream",
          tamano: file.size,
          url: `/uploads/${safeName}`,
          ticketId: ticket.id
        }
      });
      saved.push(adjunto);
    }

    await logTicketAction({
      ticketId: ticket.id,
      autorId: user.id,
      accion: "ADJUNTO_SUBIDO",
      detalle: { total: saved.length }
    });

    return NextResponse.json({ adjuntos: saved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudieron subir adjuntos" }, { status: 400 });
  }
}
