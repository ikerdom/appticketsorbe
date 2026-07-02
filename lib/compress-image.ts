/**
 * Compresión de imágenes en cliente antes de subir.
 *
 * Por qué: pedimos capturas de pantalla completa, pero una captura 2K/4K en PNG
 * supera fácilmente los 3 MB que admite el endpoint (base64 +33% vs límite 4.5 MB
 * de Vercel). Comprimir en cliente hace que el pegado funcione siempre y evita
 * engordar la BD (los adjuntos se guardan como base64 en Neon).
 *
 * Estrategia: si pesa < 300 KB se sube tal cual. Si no, se reescala a máx 1920 px
 * y se convierte a JPEG bajando calidad hasta encajar. Fondo blanco para PNG con
 * transparencia (JPEG no la soporta).
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 300 * 1024) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // formato raro — que lo valide el servidor
  }

  const MAX_DIM = 1920;
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); return file; }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const TARGET = 2.5 * 1024 * 1024; // margen bajo el límite de 3 MB
  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (blob && blob.size <= TARGET) {
      const name = (file.name || "captura").replace(/\.\w+$/, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg" });
    }
  }
  return file; // no encajó — el límite de 3 MB del caller decidirá
}
