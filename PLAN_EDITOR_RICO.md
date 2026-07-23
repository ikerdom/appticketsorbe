# Plan — Editor rico con imágenes inline (estilo Jira)

Que las capturas pegadas con Ctrl+V queden **dentro del texto**, en el punto
exacto donde se pegaron — no en una galería aparte debajo, como ahora.

Versión: 1.0 · Fecha: 2026-07-23 · Investigación + diseño, sin implementar aún

---

## Por qué (el problema actual)

Hoy, al pegar una imagen en la descripción de un ticket o en un comentario:

1. La imagen se sube y se guarda como `Adjunto` (fila aparte en BD).
2. El texto sigue siendo texto plano (`Ticket.descripcion`, `Comentario.contenido` —
   ambos `String @db.Text`).
3. La imagen se renderiza en una **galería separada** debajo del texto —
   sin relación visual con el punto del texto donde iba pegada.

Si alguien escribe "mira esto: [pega imagen] y luego esto otro: [pega otra
imagen]", las dos capturas acaban juntas al final, sin que quede claro cuál
iba con cuál. Con 1 imagen no se nota; con 2-3 explicando pasos distintos, sí.

**Jira no tiene este problema** porque su editor es de texto enriquecido: la
imagen se inserta como parte del documento en la posición del cursor.

---

## Cómo lo hace Jira (investigado)

Jira/Confluence usan **ADF — Atlassian Document Format**: el contenido no se
guarda como HTML ni como texto plano, sino como un árbol JSON de nodos
tipados. Hay nodos de **bloque** (párrafo, lista, heading...) y nodos
**inline** (texto, imagen/media...). Una imagen pegada se inserta como un
nodo inline dentro del párrafo donde estaba el cursor — por eso "sigue el
hilo del texto".

El editor de Jira/Confluence está construido sobre **ProseMirror** (el mismo
framework de edición de texto estructurado que usa, entre otros, Tiptap).

Fuentes:
- [Atlassian Document Format — estructura oficial](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [What Is ADF and Why Should You Care?](https://adfapi.dev/blog/2025/06/24/what-is-atlassian-document-format-adf-and-why-should-you-care/)

---

## Qué usar en esta app (decisión técnica)

**No** hace falta adoptar ADF completo (es un formato pensado para todo el
ecosistema Atlassian, con exportación a Confluence, macros, etc. — muy por
encima de lo que necesita una app interna de tickets).

**Elegido: [Tiptap](https://tiptap.dev/)** — editor headless para React,
construido sobre ProseMirror (la misma familia técnica que usa Jira).

Por qué Tiptap y no otra cosa:

| Opción | Veredicto |
|--------|-----------|
| **Tiptap** | ✅ Elegido. React-first, headless (control total del HTML/CSS), extensión `Image` ya soportada con modo inline, paquete `FileHandler` para pegar/soltar archivos. Encaja con "una app sencilla, sin dependencias raras". |
| Slate | Requiere construir casi todo a mano (nada de extensiones listas). Más control, mucho más curro. |
| Lexical (Meta) | Potente pero pensado para apps más grandes (Facebook, WhatsApp Web). Curva de entrada mayor, overkill aquí. |
| Draft.js | Discontinuado por Meta, no recomendable para proyecto nuevo. |
| `contentEditable` a pelo | Nada de esto gratis (undo/redo, pegado, sanitizado) — reinventar la rueda. |

Fuentes:
- [Tiptap — Image extension (modo inline)](https://tiptap.dev/docs/editor/extensions/nodes/image)
- [Tiptap — FileHandler extension](https://tiptap.dev/docs/editor/extensions/functionality/filehandler)
- [Cómo subir imágenes pegadas en Tiptap (Codemzy)](https://www.codemzy.com/blog/tiptap-pasting-images)

### Formato de almacenamiento: HTML, no JSON

Guardar el `editor.getHTML()` directamente en las columnas que ya existen
(`Ticket.descripcion`, `Comentario.contenido` — ambas `String @db.Text`).

**Sin migración de schema.** Una imagen inline queda así dentro del HTML:

```html
<p>Mira esto:</p>
<img src="/api/tickets/{ticketId}/adjuntos/{adjuntoId}" data-adjunto-id="{adjuntoId}" alt="captura.png" />
<p>y luego esto otro:</p>
<img src="/api/tickets/{ticketId}/adjuntos/{adjuntoId2}" data-adjunto-id="{adjuntoId2}" alt="captura2.png" />
```

El `src` apunta a los endpoints de adjuntos que YA existen (creados para
arreglar el bug de imágenes pesadas: `/api/tickets/[id]/adjuntos/[adjuntoId]`
autenticado, `/api/public/tickets/[id]/adjuntos/[adjuntoId]` para la vista
pública). El `Adjunto` en BD sigue existiendo igual que ahora — lo único que
cambia es que además de (opcionalmente) aparecer en una lista, su referencia
vive también dentro del propio texto.

---

## Seguridad — lo más delicado de todo esto

En cuanto el contenido pasa de texto plano a HTML, cualquier usuario que
escriba un ticket o comentario puede intentar meter `<script>`, `onerror=`,
`<iframe>` etc. Esto se renderiza para OTROS usuarios (admins, y en el caso
de la vista pública, **cualquiera con el enlace, sin login**). Es una
inyección de XSS almacenado si no se sanitiza bien.

**Doble sanitizado obligatorio:**

1. **Al guardar** (servidor, en el POST/PATCH de ticket y comentario) —
   limpiar el HTML antes de meterlo en BD.
2. **Al mostrar** (servidor, en las páginas que renderizan `descripcion`/
   `contenido`) — limpiar otra vez antes de pintar. Defensa en profundidad:
   si algo se coló al guardar (bug, dato antiguo, migración futura), no se
   ejecuta al mostrar.

Librería: **`isomorphic-dompurify`** — funciona igual en Server Components
(Node) y en cliente, a diferencia de `dompurify` a secas que es solo browser.

```typescript
// lib/sanitize-html.ts
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "img", "blockquote", "code", "pre"];
const ALLOWED_ATTR = ["href", "src", "alt", "data-adjunto-id", "target", "rel"];

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Solo permitir <img src="/api/..."> de nuestros propios endpoints —
    // bloquea trackers externos y exfiltración de datos vía <img src="https://evil.com/...">
    ALLOWED_URI_REGEXP: /^(?:\/api\/(?:public\/)?tickets\/|https?:\/\/)/
  });
}
```

Usar `sanitizeRichText()` en:
- `POST /api/tickets` (crear ticket, campo `descripcion`)
- `PATCH /api/tickets/[id]` (editar ticket, campo `descripcion`)
- `POST /api/tickets/[id]/comentarios` (campo `contenido`)
- Opcionalmente también al leer, si se quiere doble defensa (recomendado
  dado que esta app la van a tocar varias sesiones de IA distintas con el
  tiempo — mejor no confiar en que todos los puntos de escritura futuros
  recuerden sanitizar).

---

## Compatibilidad con contenido antiguo

Tickets y comentarios ya existentes tienen texto plano (sin tags HTML). Al
pasar por el nuevo renderer, un string sin `<` se trata como texto plano y
se escapa dentro de un `<p>` — no hace falta backfill ni migración de datos:

```typescript
// lib/rich-content.ts
export function looksLikeHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function toDisplayHtml(content: string): string {
  if (looksLikeHtml(content)) return sanitizeRichText(content);
  // Texto plano legacy: escapar y respetar saltos de línea, igual que
  // el whitespace-pre-wrap actual pero ya como HTML real
  const escaped = content
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br />")}</p>`;
}
```

Con esto, tickets viejos se siguen viendo exactamente igual; tickets nuevos
con imágenes inline se ven con las imágenes en su sitio.

---

## El problema difícil: pegar imagen ANTES de que el ticket exista

En `new-ticket-form.tsx`, hoy las imágenes pegadas se guardan en memoria
(`pendingImages`, con `URL.createObjectURL`) y solo se suben a
`/api/tickets/{id}/adjuntos` **después** de crear el ticket — porque
`Adjunto.ticketId` es una FK obligatoria, no puede existir sin ticket.

Para que la imagen quede inline en el editor DURANTE la creación (antes de
tener `ticketId`), hace falta:

1. Al pegar, insertar en el editor un nodo de imagen con `src` temporal
   (`URL.createObjectURL(file)` — un `blob:` local, solo válido en esa pestaña).
2. Guardar en un mapa `Map<tempId, File>` el archivo real pendiente de subir.
3. Al enviar el formulario: crear el ticket primero (sin adjuntos), luego
   subir cada imagen pendiente y, por cada una, **reemplazar en el HTML**
   el `blob:` temporal por la URL real del endpoint
   (`/api/tickets/{ticketId}/adjuntos/{adjuntoId}`) antes de guardar la
   descripción final.
4. Solo entonces hacer el `PATCH` de descripción con las URLs ya definitivas.

Es el sub-problema más delicado del plan. Por eso el orden de implementación
(abajo) deja el formulario de creación para el final — comentarios y edición
de ticket ya tienen `ticketId` real desde el principio, son mucho más simples.

---

## Resumen de cambios

| ID | Cambio | Esfuerzo | Dónde |
|----|--------|----------|-------|
| [R1](#r1--instalar-tiptap) | Instalar Tiptap + extensiones | 10 min | `package.json` |
| [R2](#r2--sanitizado-html) | `lib/sanitize-html.ts` + `lib/rich-content.ts` | 30 min | nuevo |
| [R3](#r3--componente-editor-reutilizable) | Componente `<RichTextEditor>` | 1h30 | nuevo |
| [R4](#r4--componente-de-solo-lectura) | Componente `<RichContent>` (solo lectura) | 30 min | nuevo |
| [R5](#r5--comentarios-primero) | Comentarios: editor + paste inline | 1h | `ticket-detail-view.tsx` |
| [R6](#r6--edición-de-ticket-existente) | Edición de descripción de ticket existente | 45 min | `ticket-detail-view.tsx` |
| [R7](#r7--vista-de-solo-lectura) | Sustituir renderizado plano por `<RichContent>` | 30 min | `ticket-detail-view.tsx`, vista pública |
| [R8](#r8--creación-de-ticket-lo-difícil) | Creación de ticket — imágenes pendientes | 2h | `new-ticket-form.tsx` |
| [R9](#r9--quality-gate) | Ajustar el gate de 100 caracteres (contar solo texto) | 15 min | `new-ticket-form.tsx` |

**Orden recomendado:** R1 → R2 → R3 → R4 → R5 → R6 → R7 → R9 → R8

(R8 al final a propósito — es el más arriesgado, y para entonces ya se habrá
probado el editor en comentarios y edición sin el problema del ticket
inexistente).

---

## R1 — Instalar Tiptap

```bash
cd "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-placeholder isomorphic-dompurify
```

- `@tiptap/starter-kit` — negrita, cursiva, listas, párrafos (lo básico).
- `@tiptap/extension-image` — nodo de imagen, con `inline: true`.
- `@tiptap/extension-placeholder` — placeholder tipo "Describe el problema..." (reemplaza el `placeholder` del `<textarea>` actual).
- `isomorphic-dompurify` — sanitizado en servidor y cliente.

---

## R2 — Sanitizado HTML

Crear `lib/sanitize-html.ts` y `lib/rich-content.ts` con el código de las
secciones "Seguridad" y "Compatibilidad" de arriba.

---

## R3 — Componente editor reutilizable

`components/ui/rich-text-editor.tsx` — client component, usado tanto para
descripción de ticket como para comentarios.

```typescript
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Paperclip } from "lucide-react";
import { compressImage } from "@/lib/compress-image";

interface RichTextEditorProps {
  content: string;                 // HTML inicial (o "" para nuevo)
  onChange: (html: string) => void;
  onImagePaste: (file: File) => Promise<string>; // sube la imagen, devuelve el src final
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ content, onChange, onImagePaste, placeholder, minHeight = "160px" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Placeholder.configure({ placeholder })
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none focus:outline-none" },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((i) => i.type.startsWith("image/"));
        if (!imageItem) return false; // deja que Tiptap maneje el pegado normal (texto)

        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return true;

        compressImage(file).then(async (compressed) => {
          const { schema } = view.state;
          // Placeholder local mientras sube (blob: se revoca tras insertar la URL final)
          const tempUrl = URL.createObjectURL(compressed);
          const node = schema.nodes.image.create({ src: tempUrl, alt: "Subiendo…" });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);

          const finalSrc = await onImagePaste(compressed);
          // Reemplazar el blob temporal por la URL definitiva
          editor?.commands.command(({ tr, state }) => {
            state.doc.descendants((n, pos) => {
              if (n.type.name === "image" && n.attrs.src === tempUrl) {
                tr.setNodeAttribute(pos, "src", finalSrc);
                tr.setNodeAttribute(pos, "alt", compressed.name);
              }
            });
            return true;
          });
          URL.revokeObjectURL(tempUrl);
        });

        return true;
      }
    }
  });

  return (
    <div className="rounded-xl border focus-within:ring-2 focus-within:ring-indigo-400" style={{ minHeight }}>
      <EditorContent editor={editor} className="p-3" />
      <div className="flex items-center gap-1.5 border-t px-3 py-1.5 text-[11px] text-slate-400">
        <Paperclip className="h-3 w-3" />
        Pega una imagen (Ctrl+V) y aparecerá aquí mismo
      </div>
    </div>
  );
}
```

`onImagePaste` es quien sabe CÓMO subir (varía entre comentario/edición —
ticket ya existe, POST directo — y creación — ver R8).

---

## R4 — Componente de solo lectura

`components/ui/rich-content.tsx` — Server Component, para mostrar
descripción/comentarios ya guardados (no necesita Tiptap, solo pintar HTML
ya sanitizado):

```typescript
import { toDisplayHtml } from "@/lib/rich-content";

export function RichContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm max-w-none prose-img:rounded-lg prose-img:max-w-full ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: toDisplayHtml(html) }}
    />
  );
}
```

(`toDisplayHtml` ya sanitiza dentro — ver R2. El `dangerouslySetInnerHTML` es
seguro aquí porque el HTML pasó por DOMPurify justo antes.)

Necesita el plugin `@tailwindcss/typography` para las clases `prose` — si no
está ya instalado:

```bash
npm install -D @tailwindcss/typography
```

Y añadirlo en `tailwind.config.ts`:
```typescript
plugins: [require("@tailwindcss/typography")]
```

---

## R5 — Comentarios primero

En `ticket-detail-view.tsx`, sustituir el `<Textarea>` del composer de
comentarios por `<RichTextEditor>`. El ticket ya existe (`ticket.id` real),
así que `onImagePaste` es directo:

```typescript
async function handleCommentImagePaste(file: File): Promise<string> {
  const base64 = await fileToBase64(file); // helper: FileReader.readAsDataURL + split(",")[1]
  const res = await fetch(`/api/tickets/${ticket.id}/adjuntos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, tipo: file.type, base64 })
  });
  const { adjuntos: [adj] } = await res.json();
  return `/api/tickets/${ticket.id}/adjuntos/${adj.id}`;
}
```

El `contenido` que se envía al crear el comentario pasa a ser
`editorHtml` en vez de `comment` (el string plano actual).

---

## R6 — Edición de descripción de ticket existente

Mismo patrón que R5, pero sobre `editForm.descripcion` en el modo edición
del ticket (el bloque `editingTicket` en `ticket-detail-view.tsx`). El
ticket ya existe, mismo `onImagePaste` que R5.

---

## R7 — Vista de solo lectura

Sustituir en `ticket-detail-view.tsx`, `app/public/tickets/[id]/page.tsx` y
donde se muestre `ticket.descripcion` / `comentario.contenido` como texto
plano (`whitespace-pre-wrap`), usar `<RichContent html={...} />` en su lugar.

Esto es retrocompatible automáticamente por R2/`toDisplayHtml`.

---

## R8 — Creación de ticket (lo difícil)

En `new-ticket-form.tsx`, sustituir el `<Textarea>` de descripción por
`<RichTextEditor>`, con `onImagePaste` que NO sube nada todavía — solo
registra el archivo pendiente y devuelve un `blob:` local:

```typescript
const pendingInlineImages = useRef<Map<string, File>>(new Map());

async function handleCreateImagePaste(file: File): Promise<string> {
  const tempId = crypto.randomUUID();
  pendingInlineImages.current.set(tempId, file);
  return URL.createObjectURL(file); // válido solo en esta sesión de navegador
}
```

Al enviar el formulario (`onSubmit`), **después** de crear el ticket:

```typescript
let finalDescripcionHtml = descripcionHtml;
for (const [tempId, file] of pendingInlineImages.current) {
  const base64 = await fileToBase64(file);
  const res = await fetch(`/api/tickets/${ticket.id}/adjuntos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, tipo: file.type, base64 })
  });
  const { adjuntos: [adj] } = await res.json();
  // Reemplazar el blob: temporal (guardado como atributo data-temp-id) por la URL real
  finalDescripcionHtml = finalDescripcionHtml.replace(
    new RegExp(`src="blob:[^"]*"[^>]*data-temp-id="${tempId}"`, "g"),
    `src="/api/tickets/${ticket.id}/adjuntos/${adj.id}"`
  );
}
// PATCH final con las URLs ya reales
await fetch(`/api/tickets/${ticket.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ descripcion: finalDescripcionHtml })
});
```

**Nota:** para que el `replace` por regex funcione hace falta que el nodo de
imagen temporal lleve también `data-temp-id="{tempId}"` como atributo (no
solo el `src`) — añadir esa lógica en el `handlePaste` del R3 cuando se use
en modo creación (parámetro extra o una variante del componente).

Si esto resulta demasiado frágil en la práctica (el regex sobre HTML
generado por Tiptap es right, pero cualquier cambio de cómo Tiptap serializa
atributos lo rompe), alternativa más robusta: en vez de reemplazar con
regex, recorrer el DOM del HTML con un parser (`node-html-parser` o
`cheerio`, ya que esto corre en el cliente antes de enviar, se puede hacer
con el propio DOM del navegador: `new DOMParser().parseFromString(html,
"text/html")`, buscar `img[data-temp-id]`, cambiar `.src`, y volver a
serializar con `.outerHTML`). Preferible al regex — más seguro.

---

## R9 — Quality gate (mínimo 100 caracteres)

El contador actual (`components/tickets/new-ticket-form.tsx`) cuenta
caracteres del string plano. Con HTML de por medio, `<p>hola</p>` cuenta
"11 caracteres" aunque el texto real sean solo "hola" (4). Hay que contar
sobre el texto extraído, no sobre el HTML:

```typescript
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}
const caracteres = stripHtml(descripcionHtml).length;
```

---

## Archivos a crear

| Archivo | Contenido |
|---------|-----------|
| `lib/sanitize-html.ts` | `sanitizeRichText()` — DOMPurify con allowlist |
| `lib/rich-content.ts` | `looksLikeHtml()`, `toDisplayHtml()` — compat con texto plano legacy |
| `components/ui/rich-text-editor.tsx` | Editor Tiptap reutilizable (client) |
| `components/ui/rich-content.tsx` | Renderer de solo lectura (server) |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `package.json` | + Tiptap, isomorphic-dompurify, @tailwindcss/typography |
| `tailwind.config.ts` | + plugin typography |
| `app/api/tickets/route.ts` | Sanitizar `descripcion` al crear (POST) |
| `app/api/tickets/[id]/route.ts` | Sanitizar `descripcion` al editar (PATCH) |
| `app/api/tickets/[id]/comentarios/route.ts` | Sanitizar `contenido` al comentar |
| `components/tickets/ticket-detail-view.tsx` | R5, R6, R7 |
| `components/tickets/new-ticket-form.tsx` | R8, R9 |
| `app/public/tickets/[id]/page.tsx` | R7 — `<RichContent>` en vez de texto plano |

---

## Qué NO hacer (fuera de scope)

- **No** adoptar ADF/JSON completo — HTML + sanitizado es suficiente y
  mucho más simple para el tamaño de esta app.
- **No** backfill de tickets/comentarios antiguos — `toDisplayHtml` los
  trata bien tal cual están, sin tocarlos.
- **No** editor de texto enriquecido para notas internas (`NotaTicket`) ni
  propuestas por ahora — empezar por tickets (descripción + comentarios),
  que es donde se pegan las capturas de verdad. Si funciona bien, extender
  después es trivial (mismo componente, otro campo).
- **No** soporte de vídeo/GIF pegado — sigue igual que ahora, solo imágenes
  (`image/*`), coherente con la decisión ya tomada de "sin servicio externo
  de storage" en CLAUDE.md.

---

## Verificación manual tras implementar

1. Crear ticket nuevo, escribir texto, pegar 2 imágenes en puntos distintos
   del texto → deben aparecer donde se pegaron, no todas al final.
2. Enviar el ticket → abrir el detalle → las imágenes siguen en su sitio
   (prueba de que el reemplazo blob→URL real en R8 funcionó).
3. Comentar con una imagen pegada en medio del comentario.
4. Editar la descripción de un ticket YA existente, pegar otra imagen.
5. Ver el ticket en la vista pública (sin login) → imágenes inline se ven
   igual que en la vista con login.
6. Ticket antiguo (de antes de este cambio, texto plano con saltos de
   línea) → se sigue viendo exactamente igual que antes.
7. Intentar pegar `<script>alert(1)</script>` a mano en el campo (con
   herramientas de dev del navegador, saltándose el editor) → verificar que
   el HTML guardado en BD NO contiene el script (sanitizado en servidor).

---

## Notas de contexto

- **Dependencia previa:** este plan asume ya hecho el fix de servir
  adjuntos vía `/api/tickets/[id]/adjuntos/[adjuntoId]` (no como base64
  embebido) — sin eso, cada imagen inline volvería a meter varios MB de
  base64 directamente en `descripcion`/`contenido`, reintroduciendo el
  mismo problema de memoria en móvil que motivó ese fix.
- **Shell:** siempre arranca en OrbeBI. Usar `cd` explícito al APPTICKET.
- **URL local:** `http://127.0.0.1:3000` — NO `localhost` (redirige, ver
  `middleware.ts`).
- **Deploy:** push a `main` → Vercel auto-deploy (~2 min).
- Package `uploadthing` ya está en `package.json` pero **no se usa** —
  decisión deliberada de no depender de storage externo (ver CLAUDE.md).
  Este plan no lo usa tampoco; imágenes siguen guardándose como antes
  (base64 en Postgres/Neon vía `Adjunto`), solo cambia DÓNDE se referencian
  (inline en el HTML en vez de solo en una galería aparte).
