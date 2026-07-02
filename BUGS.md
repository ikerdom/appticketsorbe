# Bug Tracker — AppTickets

Registro de bugs conocidos, su causa y el fix planificado.
Última actualización: 2026-06-18

---

## Leyenda de estados

| Estado | Significado |
|--------|-------------|
| 🔴 ABIERTO | Bug confirmado, sin fix |
| 🟡 EN_ANÁLISIS | Causa identificada, fix en progreso |
| 🟢 RESUELTO | Fix aplicado y en producción |
| ⚪ DESCARTADO | No reproducible o no es bug |

---

## B001 — Tickets fantasma en kanban tras mover estado

**Estado:** 🟢 RESUELTO — 2026-06-18

**Severidad:** CRÍTICA

**Descripción:**
Al mover un ticket a otro estado en el kanban (especialmente a RESUELTO), aparecen 2-3 tickets de una "versión antigua" que ya deberían estar resueltos pero reaparecen como ABIERTOS. Desaparecen al refrescar la página manualmente.

**Reproducción:**
1. Tener 7+ tickets en el kanban
2. Arrastrar uno a RESUELTO y confirmar
3. Esperar ~2 segundos
4. Observar tickets fantasma que aparecen en columnas incorrectas

**Causa raíz identificada:**
`backgroundSync()` en `components/kanban/kanban-board.tsx` (línea ~200).

Secuencia de eventos que causa el bug:
```
1. onDragEnd() → optimistic update correcto en estado React
2. PATCH /api/tickets/{id}/estado → escribe en Neon ✓
3. scheduleSync() → setTimeout 1500ms
4. backgroundSync() → GET /api/tickets (cache: "no-store")
5. Neon connection pool devuelve datos PRE-escritura (read-after-write race)
6. setTickets(data.tickets) reemplaza TODO el estado con datos stale
7. Resultado: tickets optimisticamente movidos vuelven a su estado anterior
```

El problema es la combinación de:
- Neon serverless con connection pooling (reads pueden ir a réplicas no actualizadas)
- `backgroundSync` reemplaza el estado React completo en vez de hacer merge
- 1500ms no siempre es suficiente para que Neon propague la escritura

**Fix propuesto:**
Reemplazar `backgroundSync()` + `scheduleSync()` por `router.refresh()` del App Router.

```typescript
// kanban-board.tsx — ANTES
function scheduleSync() {
  setTimeout(() => { void backgroundSync(); }, 1500);
}

// kanban-board.tsx — DESPUÉS
import { useRouter } from "next/navigation";
const router = useRouter();

function scheduleSync() {
  setTimeout(() => router.refresh(), 800);
}
```

`router.refresh()` re-ejecuta el Server Component desde el servidor con una query Prisma directa al primary de Neon, sin pasar por el pool cliente. El estado React del componente se preserva durante el refresh.

**Archivos a modificar:**
- `components/kanban/kanban-board.tsx` — reemplazar `backgroundSync` + `scheduleSync`
- Eliminar la función `backgroundSync` completa (ya no es necesaria)

---

---

## B003 — Confirmación de resolución usa `window.confirm()` nativo

**Estado:** 🟢 RESUELTO — 2026-06-18 (reemplazado por Dialog propio en components/ui/dialog.tsx)

**Severidad:** BAJA (UX)

**Descripción:**
Al mover un ticket a RESUELTO, el navegador muestra el diálogo nativo `window.confirm()` que:
- No se puede personalizar visualmente
- En móvil tiene aspecto inconsistente con el resto de la app
- Bloquea el thread principal del navegador

**Reproducción:**
Arrastrar cualquier ticket a la columna RESUELTO en el kanban.

**Causa:**
`kanban-board.tsx` línea ~267:
```typescript
const ok = window.confirm("¿Confirmas marcar este ticket como resuelto?");
if (!ok) return;
```

**Fix planificado:**
Reemplazar por un Dialog de shadcn/ui con:
- Título: "Marcar como resuelto"
- Texto: "¿Confirmas que este ticket está completamente resuelto? Se notificará al creador."
- Campo opcional: "Nota de resolución" (textarea)
- Botones: "Cancelar" (outline) | "Marcar resuelto" (green solid)

---

## B004 — SLA timer hardcodeado a 72h para todos los niveles

**Estado:** 🟢 RESUELTO — 2026-06-18 (SLA por prioridad en sortable-ticket-card.tsx)

**Severidad:** BAJA

**Descripción:**
El timer de SLA en las tarjetas del kanban cambia a rojo cuando el ticket lleva más de 72h sin resolver, independientemente de la prioridad. Un ticket CRÍTICO debería ponerse en rojo a las 4h, no a las 72h.

**Causa:**
`components/kanban/sortable-ticket-card.tsx` — lógica de SLA fija a 72h.

**Fix planificado:**
```typescript
const SLA_HORAS: Record<Prioridad, number> = {
  CRITICA: 4,
  ALTA: 24,
  MEDIA: 72,
  BAJA: 120  // 5 días
};
```

---

## B005 — Tabs de kanban en móvil no muestran badge de contador

**Estado:** 🟢 RESUELTO — ya implementado en kanban-board.tsx

**Severidad:** MUY BAJA (UX móvil)

**Descripción:**
En la vista móvil (< md), el kanban usa tabs (ABIERTO / EN CURSO / RESUELTO). El contador de tickets por estado no es visible en los tabs, lo que obliga al usuario a ir tab a tab para ver cuántos hay.

**Fix:** Ya implementado. Los TabsTrigger muestran `{ESTADO_LABELS[estado]} ({grouped[estado].length})` — ej. "Abierto (3)".

---

---

## Bugs resueltos (histórico)

*(vacío — a completar con los fixes que se vayan aplicando)*

| ID | Descripción | Fix aplicado | Fecha |
|----|-------------|--------------|-------|
| — | — | — | — |

---

## B007 — `confirm()` nativo en eliminar propuesta (admin)

**Estado:** 🟢 RESUELTO — 2026-06-19

**Severidad:** BAJA (UX)

**Descripción:**
En la vista admin de propuestas, al pulsar el icono de papelera aparece el diálogo nativo `confirm()` del navegador, inconsistente con el resto de la app.

**Causa:**
`components/propuestas/propuestas-admin-list.tsx` función `deletePropuesta()`:
```typescript
if (!confirm("¿Eliminar esta propuesta?")) return;
```

**Fix aplicado:**
Reemplazado por `Dialog` de `components/ui/dialog.tsx` (mismo patrón que B003 en kanban).
Estado local `deleteConfirm` controla apertura/cierre. `handleDeleteConfirmed()` ejecuta el DELETE tras confirmar.

---

## B008 — Formulario de nuevo ticket no se puede enviar (onChange pisado)

**Estado:** 🟢 RESUELTO — 2026-07-02

**Severidad:** CRÍTICA

**Descripción:**
Desde el cambio del "quality gate" (d42e833), el formulario de nuevo ticket no se podía enviar. El contador de palabras se quedaba en 0/30 aunque escribieras, y al pulsar "Crear ticket" no pasaba nada. Pegar imágenes tampoco desbloqueaba el envío.

**Causa raíz:**
`components/tickets/new-ticket-form.tsx` — el Textarea de descripción tenía:
```tsx
{...form.register("descripcion")}   // register incluye su propio onChange
onChange={() => { if (descError) setDescError(null); }}  // ← definido DESPUÉS del spread
```
En JSX, la prop posterior gana: el `onChange` manual **sobrescribía el de react-hook-form**, así que RHF nunca recibía el texto. `useWatch` devolvía siempre `""`, zod validaba descripción vacía y `handleSubmit` no llegaba a ejecutar el submit.

**Fix aplicado:**
Extraer el register y encadenar los dos handlers:
```tsx
const descripcionField = form.register("descripcion");
...
<Textarea
  {...descripcionField}
  onChange={(e) => {
    descripcionField.onChange(e); // RHF primero
    if (descError) setDescError(null);
  }}
/>
```

**Lección:** nunca poner un `onChange` propio después de un spread de `register()` — siempre encadenar.

---

## B009 — Capturas de pantalla completa rechazadas por el límite de 3 MB

**Estado:** 🟢 RESUELTO — 2026-07-02 (compresión en cliente)

**Severidad:** ALTA

**Descripción:**
El formulario pide "captura de pantalla completa", pero una captura 2K/4K en PNG supera fácilmente los 3 MB → el propio límite del cliente la rechazaba. Contradicción directa con las normas que mostramos.

**Fix aplicado:**
Nuevo `lib/compress-image.ts`: si la imagen pesa > 300 KB, se reescala a máx 1920 px y se convierte a JPEG bajando calidad (0.85 → 0.7 → 0.55) hasta quedar bajo 2.5 MB. Fondo blanco para PNG con transparencia. Se usa en:
- `new-ticket-form.tsx` → `addImageFiles()` (paste, drop, picker)
- `ticket-detail-view.tsx` → `uploadImageFile()` (comentarios)

Beneficio extra: la BD (base64 en Neon) engorda mucho menos por adjunto.

---

## Cómo reportar un bug nuevo

Para añadir un bug a este fichero, usar esta plantilla:

```markdown
## B00X — Título corto

**Estado:** 🔴 ABIERTO

**Severidad:** CRÍTICA / ALTA / MEDIA / BAJA / MUY BAJA (UX)

**Descripción:**
Qué pasa.

**Reproducción:**
1. Paso 1
2. Paso 2
3. ...

**Causa raíz identificada:**
Dónde está el problema en el código (archivo + línea si se sabe).

**Fix planificado:**
Qué hay que cambiar.
```
