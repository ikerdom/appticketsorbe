import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "img", "blockquote", "code", "pre"];
const ALLOWED_ATTR = ["href", "src", "alt", "data-adjunto-id", "data-temp-id", "target", "rel"];

/**
 * Sanitiza HTML de usuario antes de guardarlo o de mostrarlo. Doble uso a
 * propósito (defensa en profundidad): si algo se cuela al guardar, no se
 * ejecuta al mostrar.
 *
 * ALLOWED_URI_REGEXP restringe <img src> a nuestros propios endpoints de
 * adjuntos (o blob: temporales mientras sube una imagen recién pegada) —
 * bloquea trackers externos tipo <img src="https://evil.com/pixel.png">.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:\/api\/(?:public\/)?tickets\/|\/api\/adjuntos\/|blob:|https?:\/\/)/
  });
}
