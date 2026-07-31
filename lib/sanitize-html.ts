import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "img", "blockquote", "code", "pre"];

// <img src> se restringe a nuestras propias rutas de adjuntos (o blob: temporal
// mientras sube una imagen recien pegada) — evita pixels-tracker externos tipo
// <img src="https://evil.com/pixel.png">. <a href> sigue permitiendo http(s)
// normal para enlaces de texto (via allowedSchemes, sin este filtro extra).
const INTERNAL_IMG_SRC = /^(?:\/api\/(?:public\/)?tickets\/|\/api\/adjuntos\/|blob:)/;

/**
 * Sanitiza HTML de usuario antes de guardarlo o de mostrarlo. Doble uso a
 * proposito (defensa en profundidad): si algo se cuela al guardar, no se
 * ejecuta al mostrar.
 *
 * Usa el paquete "sanitize-html" (parser JS puro) en vez de
 * isomorphic-dompurify: ese usaba jsdom, que crasheaba las funciones
 * serverless de Vercel en produccion (toda ruta que llamaba a
 * sanitizeRichText devolvia 500 — creacion de ticket, edicion, comentarios —
 * aunque en local funcionaba perfecto). No es un bug de logica, es que
 * jsdom no arranca en ese entorno.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "data-adjunto-id", "data-temp-id"]
    },
    allowedSchemes: ["http", "https", "blob"],
    transformTags: {
      img: (tagName, attribs) => {
        if (!attribs.src || !INTERNAL_IMG_SRC.test(attribs.src)) {
          const { src, ...rest } = attribs;
          return { tagName, attribs: rest };
        }
        return { tagName, attribs };
      }
    }
  });
}
