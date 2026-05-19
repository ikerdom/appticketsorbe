import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { puedeVerTicket } from "@/lib/permisos";
import { requireCurrentUser } from "@/lib/data";
import { logTicketAction } from "@/lib/audit";

const MAX_FILES_PER_REQUEST = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
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

    if (IS_VERCEL) {
      return NextResponse.json({ error: "La subida de archivos requiere configurar el almacenamiento externo (UploadThing). Contacta con el administrador." }, { status: 501 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES_PER_REQUEST} archivos por subida.` },
        { status: 400 }
      );
    }
    const oversized = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      return NextResponse.json(
        { error: `El archivo ${oversized.name} supera el límite de 10MB.` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const saved = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const diskPath = path.join(uploadDir, safeName);
      await writeFile(diskPath, buffer);

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

