import xss from "xss";

const WHITE_LIST: Record<string, string[]> = {
  p: [],
  br: [],
  strong: [],
  em: [],
  u: [],
  s: [],
  ul: [],
  ol: [],
  li: [],
  blockquote: [],
  code: [],
  pre: [],
  a: ["href", "target", "rel"],
  img: ["src", "alt", "data-adjunto-id", "data-temp-id"]
};

// <img src> se restringe a nuestras propias rutas de adjuntos (o blob: temporal
// mientras sube una imagen recien pegada) — evita pixels-tracker externos tipo
// <img src="https://evil.com/pixel.png">. <a href> sigue permitiendo http(s)
// normal para enlaces de texto (procesado por defecto de la libreria, no por
// este filtro extra que solo aplica a img/src).
const INTERNAL_IMG_SRC = /^(?:\/api\/(?:public\/)?tickets\/|\/api\/adjuntos\/|blob:)/;

/**
 * Sanitiza HTML de usuario antes de guardarlo o de mostrarlo. Doble uso a
 * proposito (defensa en profundidad): si algo se cuela al guardar, no se
 * ejecuta al mostrar.
 *
 * Usa el paquete "xss" (parser JS puro, CommonJS, sin dependencias con
 * problemas de ESM). Antes se uso isomorphic-dompurify (jsdom) y luego
 * sanitize-html (que arrastra htmlparser2, publicado como ESM-only en su
 * version actual) — ambos crasheaban en produccion (Vercel) con
 * "ERR_REQUIRE_ESM" / fallos de jsdom en el runtime serverless, aunque
 * funcionaban perfecto en local. Confirmado con logs reales de Vercel
 * (`vercel logs`), no solo local: toda ruta que llamaba a esta funcion
 * devolvia 500 (crear ticket, editar, comentar), el resto de la app
 * funcionaba normal.
 */
export function sanitizeRichText(html: string): string {
  return xss(html, {
    whiteList: WHITE_LIST,
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
    onTagAttr: (tag, name, value) => {
      if (tag === "img" && name === "src") {
        return INTERNAL_IMG_SRC.test(value) ? `src="${value}"` : "";
      }
      return undefined;
    }
  });
}
