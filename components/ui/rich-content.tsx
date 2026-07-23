import { toDisplayHtml } from "@/lib/rich-content";

/**
 * Renderiza descripcion/contenido (HTML nuevo o texto plano legacy) de forma
 * segura — toDisplayHtml ya sanitiza, por eso dangerouslySetInnerHTML es
 * seguro aquí. Server Component: no necesita "use client".
 *
 * compact: menos margen vertical en párrafos/imágenes — para burbujas de
 * chat (comentarios), donde el espaciado normal de "prose" queda suelto.
 */
export function RichContent({ html, className, compact }: { html: string; className?: string; compact?: boolean }) {
  const spacing = compact ? "prose-p:my-1 prose-img:my-1" : "prose-p:my-2 prose-img:my-2";
  return (
    <div
      className={`prose prose-sm prose-slate max-w-none prose-img:rounded-lg prose-img:max-w-full ${spacing} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: toDisplayHtml(html) }}
    />
  );
}
