import { sanitizeRichText } from "@/lib/sanitize-html";

/** Detecta si un contenido ya es HTML (nuevo) o texto plano (legacy, pre-editor rico). */
export function looksLikeHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Convierte descripcion/contenido guardado a HTML seguro para pintar.
 * Contenido legacy (texto plano, de antes del editor rico) se escapa y se
 * respetan los saltos de línea — se ve exactamente igual que antes, sin
 * necesidad de migrar datos.
 */
export function toDisplayHtml(content: string): string {
  if (looksLikeHtml(content)) return sanitizeRichText(content);

  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br />")}</p>`;
}

/**
 * Reescribe <img src> de las rutas privadas de adjuntos (/api/adjuntos/{id},
 * /api/tickets/{id}/adjuntos/{id}) a la ruta publica (/api/public/tickets/
 * {ticketId}/adjuntos/{id}) — para la vista publica sin login, donde el
 * visitante no tiene sesion y esas rutas privadas le devuelven 401/redirect
 * a login, dejando la imagen rota. Las que ya son publicas se dejan igual.
 */
export function toPublicImageSrc(html: string, ticketId: string): string {
  return html
    .replace(/src="\/api\/adjuntos\/([a-zA-Z0-9_-]+)"/g, `src="/api/public/tickets/${ticketId}/adjuntos/$1"`)
    .replace(/src="\/api\/tickets\/[a-zA-Z0-9_-]+\/adjuntos\/([a-zA-Z0-9_-]+)"/g, `src="/api/public/tickets/${ticketId}/adjuntos/$1"`);
}

/** Extrae el texto plano de un HTML — para contar caracteres reales (quality gate) sin contar marcado. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

/** true si el HTML no tiene ni texto real ni imagen — para validar "está vacío" en editores ricos. */
export function isRichContentEmpty(html: string): boolean {
  return stripHtml(html).length === 0 && !/<img\b/i.test(html);
}

/**
 * IDs de Adjunto ya referenciados inline dentro de uno o varios HTML
 * (descripcion + comentarios) — vía el path /adjuntos/{id} de su <img src>.
 * Sirve para no repetir en la galería plana antigua imágenes que ya se ven
 * en su sitio dentro del texto (solo quedan ahí las huérfanas de tickets
 * de antes de este cambio, que nunca se referenciaron inline).
 */
export function extractReferencedAdjuntoIds(htmlSources: string[]): Set<string> {
  const ids = new Set<string>();
  const re = /\/adjuntos\/([a-zA-Z0-9_-]+)/g;
  for (const html of htmlSources) {
    for (const match of html.matchAll(re)) ids.add(match[1]);
  }
  return ids;
}
