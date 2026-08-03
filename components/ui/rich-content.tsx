import { toDisplayHtml, toPublicImageSrc } from "@/lib/rich-content";

/**
 * Renderiza descripcion/contenido (HTML nuevo o texto plano legacy) de forma
 * segura — toDisplayHtml ya sanitiza, por eso dangerouslySetInnerHTML es
 * seguro aquí. Server Component: no necesita "use client".
 *
 * compact: menos margen vertical en párrafos/imágenes — para burbujas de
 * chat (comentarios), donde el espaciado normal de "prose" queda suelto.
 *
 * publicTicketId: pásalo en la vista pública sin login — reescribe las
 * imágenes inline a la ruta pública de adjuntos, si no se ven rotas (el
 * visitante no tiene sesión para la ruta privada con la que se guardaron).
 */
export function RichContent({ html, className, compact, publicTicketId }: { html: string; className?: string; compact?: boolean; publicTicketId?: string }) {
  const spacing = compact ? "prose-p:my-1 prose-img:my-1" : "prose-p:my-2 prose-img:my-2";
  const displayHtml = toDisplayHtml(html);
  return (
    <div
      className={`prose prose-sm prose-slate max-w-none prose-img:rounded-lg prose-img:max-w-full ${spacing} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: publicTicketId ? toPublicImageSrc(displayHtml, publicTicketId) : displayHtml }}
    />
  );
}
