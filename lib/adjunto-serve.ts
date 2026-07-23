import { NextResponse } from "next/server";
import type { Adjunto } from "@prisma/client";

/**
 * Sirve un Adjunto como respuesta binaria en vez de que el cliente reciba el
 * data: URL (base64) embebido en el HTML/props. Con 2-3 imágenes eso son varios
 * MB de texto duplicados en el DOM — en móvil, eso hace que el navegador
 * descarte la pestaña en segundo plano por presión de memoria y la recargue
 * (perdiendo scroll/estado) al volver a ella.
 *
 * Adjunto.url guarda "data:{tipo};base64,{...}" (subida vía clipboard/paste,
 * el único camino en producción) o "/uploads/xxx" (FormData, solo en local
 * dev) — para ese segundo caso Next.js ya sirve el archivo estático directo.
 */
export function serveAdjunto(adjunto: Pick<Adjunto, "url" | "nombre" | "tipo">) {
  if (!adjunto.url.startsWith("data:")) {
    return NextResponse.redirect(new URL(adjunto.url, "http://localhost"));
  }

  const commaIdx = adjunto.url.indexOf(",");
  const base64 = adjunto.url.slice(commaIdx + 1);
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": adjunto.tipo || "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${encodeURIComponent(adjunto.nombre)}"`
    }
  });
}
