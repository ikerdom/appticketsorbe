# Bug Tracker — AppTickets

Registro de bugs conocidos, su causa y el fix aplicado.
Última actualización: 2026-07-24

---

## Leyenda de estados

| Estado | Significado |
|--------|-------------|
| 🔴 ABIERTO | Bug confirmado, sin fix |
| 🟡 EN_ANÁLISIS | Causa identificada, fix en progreso |
| 🟢 RESUELTO | Fix aplicado y en producción |
| ⚪ DESCARTADO | No reproducible o no es bug |

---

## Abiertos

*(ninguno — todos los bugs registrados están resueltos)*

---

## Histórico

| ID | Título | Severidad | Fecha | Archivo |
|----|--------|-----------|-------|---------|
| B001 | Tickets fantasma en kanban tras mover estado (race read-after-write en Neon) | CRÍTICA | 2026-06-18 | `components/kanban/kanban-board.tsx` |
| B003 | `window.confirm()` nativo al resolver ticket | BAJA (UX) | 2026-06-18 | `components/kanban/kanban-board.tsx` |
| B004 | SLA timer hardcodeado a 72h para todas las prioridades | BAJA | 2026-06-18 | `components/kanban/sortable-ticket-card.tsx` |
| B005 | Tabs de kanban en móvil sin badge de contador | MUY BAJA (UX) | 2026-06-18 | `components/kanban/kanban-board.tsx` |
| B007 | `confirm()` nativo al eliminar propuesta (admin) | BAJA (UX) | 2026-06-19 | `components/propuestas/propuestas-admin-list.tsx` |
| B008 | Formulario nuevo ticket no se podía enviar (onChange pisado) | CRÍTICA | 2026-07-02 | `components/tickets/new-ticket-form.tsx` |
| B009 | Capturas de pantalla completa rechazadas por límite de 3 MB | ALTA | 2026-07-02 | `lib/compress-image.ts` |
| B010 | Histórico "borraba" tickets resueltos a los 7 días (filtro mal puesto) | ALTA | 2026-07-03 | `app/(app)/historico/page.tsx` |
| B011 | Imagen inline en creación de ticket perdía su `src` al guardar | ALTA | 2026-07-23 | `lib/sanitize-html.ts` |
| B012 | Warning hidratación `aria-describedby` en kanban (dnd-kit) | MUY BAJA (cosmético) | 2026-07-24 | `components/kanban/kanban-board.tsx` |

---

## Lecciones aprendidas (patrones a no repetir)

**B001 — no reemplazar estado React completo tras un write optimista.** `backgroundSync()` hacía `GET` a Neon justo después de un `PATCH`, y el pool serverless a veces devolvía una réplica no actualizada (read-after-write race), pisando el update optimista con datos viejos. Fix: `router.refresh()` del App Router en vez de fetch+setState manual — re-ejecuta el Server Component contra el primary.

**B008 — nunca poner un `onChange` propio después de un spread de `register()`.** En JSX la prop declarada después gana; un `onChange` manual tras `{...form.register(...)}` pisa silenciosamente el de react-hook-form. Encadenar siempre: `descripcionField.onChange(e)` primero, lógica propia después.

**B009 — comprimir en cliente antes de subir, no solo validar el límite.** Si el propio flujo pide "captura de pantalla completa" pero rechaza por peso, el límite debe adaptarse al contenido esperado (reescalar + JPEG progresivo) en vez de solo rechazar.

**B011 — cualquier ruta nueva que sirva adjuntos debe añadirse a `ALLOWED_URI_REGEXP` en `lib/sanitize-html.ts`.** Si no, el síntoma es siempre el mismo y engañoso: la imagen se ve bien mientras se escribe, y desaparece sin error visible al guardar (DOMPurify quita solo el atributo `src`, no la etiqueta).

**B012 — `<DndContext>` de dnd-kit necesita `id` explícito en apps con SSR.** Sin él, dnd-kit genera el id de `aria-describedby` con un contador interno que puede no coincidir entre el render de servidor y el de cliente → warning de hidratación en cualquier página con kanban. Pasar siempre `id="algo-estable"`.

---

## Cómo reportar un bug nuevo

Para añadir un bug a este fichero, usar esta plantilla en la sección "Abiertos" y moverlo al Histórico cuando se resuelva:

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
