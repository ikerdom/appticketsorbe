import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "img", "blockquote", "code", "pre"];
const ALLOWED_ATTR = ["href", "src", "alt", "data-adjunto-id", "data-temp-id", "target", "rel"];

// ALLOWED_URI_REGEXP es compartido por TODOS los atributos URI (href y src);
// DOMPurify no permite restringirlo por atributo/tag de forma nativa. Por eso
// admite https?:// (para que <a href> funcione) y el hook de abajo recorta
// ese permiso solo para <img src>, evitando pixels-tracker externos tipo
// <img src="https://evil.com/pixel.png">.
const INTERNAL_IMG_SRC = /^(?:\/api\/(?:public\/)?tickets\/|\/api\/adjuntos\/|blob:)/;

DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "src" && node.nodeName === "IMG" && !INTERNAL_IMG_SRC.test(data.attrValue)) {
    data.keepAttr = false;
  }
});

/**
 * Sanitiza HTML de usuario antes de guardarlo o de mostrarlo. Doble uso a
 * propósito (defensa en profundidad): si algo se cuela al guardar, no se
 * ejecuta al mostrar.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:\/api\/(?:public\/)?tickets\/|\/api\/adjuntos\/|blob:|https?:\/\/)/
  });
}
