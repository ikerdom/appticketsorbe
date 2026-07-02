# Plan — Módulo Propuestas de Mejora

Plan de implementación para mejorar el módulo de propuestas ya existente.
Versión: 1.0 · Fecha: 2026-06-19

---

## Estado actual

| Qué | Estado |
|-----|--------|
| Schema `Propuesta` en BD | ✅ Existe |
| API GET/POST/PATCH/DELETE | ✅ Existe |
| Página usuario `/propuestas` | ✅ Existe |
| Página admin `/admin/propuestas` | ✅ Existe |
| Link "Propuestas" en navegación | ✅ Implementado 2026-06-19 |
| Link admin en menú (💡 Propuestas) | ✅ Implementado 2026-06-19 |
| Delete con Dialog (sin confirm nativo) | ✅ Implementado 2026-06-19 |
| Notificación in-app al autor (cambio estado / respuesta admin) | ✅ Implementado 2026-07-02 |
| **Categoría de propuesta** | ❌ No existe (M3) |
| **Impacto estimado** | ❌ No existe (M4) |
| **UX mejorada** | ❌ Cards básicas (M5) |

---

## Bugs conocidos

### B007 — `confirm()` nativo en eliminar propuesta

**Estado:** 🟢 RESUELTO — 2026-06-19 (Dialog propio, mismo patrón que B003)  
**Severidad:** BAJA (UX)  
**Archivo:** `components/propuestas/propuestas-admin-list.tsx` línea 78

```typescript
// ACTUAL — nativo, inconsistente
function deletePropuesta() {
  if (!confirm("¿Eliminar esta propuesta?")) return;
  startTransition(async () => { ... });
}
```

**Fix:** Mismo patrón que B003 (resuelto en kanban). Usar el `Dialog` de `components/ui/dialog.tsx`.

```typescript
// 1. Añadir estado en PropuestaAdminCard:
const [deleteConfirm, setDeleteConfirm] = useState(false);

// 2. Reemplazar deletePropuesta:
function handleDeleteConfirmed() {
  setDeleteConfirm(false);
  startTransition(async () => {
    const res = await fetch(`/api/propuestas/${propuesta.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar"); return; }
    onDelete(propuesta.id);
    toast.success("Propuesta eliminada");
  });
}

// 3. El botón de papelera abre Dialog en vez de confirm():
<button type="button" onClick={() => setDeleteConfirm(true)} ...>
  <Trash2 className="h-3.5 w-3.5" />
</button>

// 4. Dialog al final del JSX de PropuestaAdminCard:
<Dialog
  open={deleteConfirm}
  onClose={() => setDeleteConfirm(false)}
  title="Eliminar propuesta"
  description={`¿Seguro que quieres eliminar "${propuesta.titulo}"? Esta acción no se puede deshacer.`}
>
  <DialogActions>
    <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancelar</Button>
    <Button onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</Button>
  </DialogActions>
</Dialog>
```

Imports a añadir:
```typescript
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
```

---

## Índice de cambios

| ID | Cambio | Esfuerzo | Prioridad |
|----|--------|----------|-----------|
| [B007](#b007--confirm-nativo-en-eliminar-propuesta) | Fix confirm() → Dialog en delete | ~~15 min~~ | ✅ HECHO 2026-06-19 |
| [M1](#m1--link-propuestas-en-navegación) | Link "Propuestas" en header | ~~5 min~~ | ✅ HECHO 2026-06-19 |
| [M2](#m2--link-admin-en-dropdown) | Link admin → propuestas pendientes | ~~5 min~~ | ✅ HECHO 2026-06-19 |
| [M3](#m3--categoría-de-propuesta) | Campo categoría (schema + UI) | 1h | 🟠 PENDIENTE |
| [M4](#m4--campo-impacto) | Campo impacto estimado | 30 min | 🟡 PENDIENTE |
| [M5](#m5--ux-cards-mejoradas) | Cards más visuales y limpias | 1h | 🟡 PENDIENTE |

**Siguiente:** M3 → M4 → M5

---

## M1 — Link Propuestas en navegación

**Archivo:** `components/layout/app-header.tsx`

**Problema:** No hay link a `/propuestas` en el header. El usuario tiene que saber la URL de memoria.

**Fix:** Añadir link entre "Notas internas" y el icono de ayuda.

```tsx
// ANTES (línea ~76):
<Link href="/tareas" className="hidden rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white md:inline-flex">
  Notas internas
</Link>

// DESPUÉS — añadir justo antes de ese Link:
<Link href="/propuestas" className="hidden rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white md:inline-flex">
  Propuestas
</Link>
<Link href="/tareas" className="hidden rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white md:inline-flex">
  Notas internas
</Link>
```

También añadir en el menú móvil (user dropdown, línea ~135):
```tsx
// ANTES:
<Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white md:hidden" href="/tareas">
  Notas internas
</Link>

// DESPUÉS — añadir justo antes:
<Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/propuestas">
  Propuestas
</Link>
<Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white md:hidden" href="/tareas">
  Notas internas
</Link>
```

---

## M2 — Link admin en dropdown

**Archivo:** `components/layout/app-header.tsx`

**Problema:** El admin no tiene acceso rápido a `/admin/propuestas` desde el menú.

**Fix:** Añadir link en el dropdown de Admin (bloque que empieza en línea ~99).

```tsx
// En el menú Admin, añadir después del link a "/admin/notas":
<Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/admin/propuestas">
  💡 Propuestas
</Link>
```

**Opcional — badge con contador de pendientes:**
Para mostrar cuántas propuestas esperan revisión, pasar el conteo desde el layout al header:

En `app/(app)/layout.tsx` (añadir query):
```tsx
const propuestasPendientes = await prisma.propuesta.count({
  where: { estado: "PENDIENTE" }
});
// Pasar como prop a AppHeader: propuestasPendientes={propuestasPendientes}
```

En `AppHeader` (añadir prop y mostrar badge):
```tsx
// Añadir a AppHeaderProps:
propuestasPendientes?: number;

// En el link del menú admin:
<Link className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/admin/propuestas">
  <span>💡 Propuestas</span>
  {(propuestasPendientes ?? 0) > 0 && (
    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {propuestasPendientes}
    </span>
  )}
</Link>
```

---

## M3 — Categoría de propuesta

### Schema (prisma/schema.prisma)

Añadir enum y campo al modelo `Propuesta`:

```prisma
enum PropuestaCategoria {
  PROCESO       // Mejora de proceso o flujo de trabajo
  HERRAMIENTA   // Nueva herramienta o software
  COMUNICACION  // Mejora de comunicación interna
  INFRAESTRUCTURA // Hardware, oficina, espacios
  OTRA          // Cualquier otra categoría
}

model Propuesta {
  // ... campos existentes ...
  categoria     PropuestaCategoria @default(OTRA)   // ← AÑADIR
  // ...
}
```

### Migración

```bash
cd "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"
npx prisma migrate dev --name add_propuesta_categoria
```

### Constantes compartidas (`lib/constants.ts` o nuevo `lib/propuestas.ts`)

```typescript
export const PROPUESTA_CATEGORIA_LABELS: Record<string, string> = {
  PROCESO: "Proceso",
  HERRAMIENTA: "Herramienta",
  COMUNICACION: "Comunicación",
  INFRAESTRUCTURA: "Infraestructura",
  OTRA: "Otra"
};

export const PROPUESTA_CATEGORIA_COLORS: Record<string, string> = {
  PROCESO: "bg-violet-100 text-violet-700",
  HERRAMIENTA: "bg-blue-100 text-blue-700",
  COMUNICACION: "bg-emerald-100 text-emerald-700",
  INFRAESTRUCTURA: "bg-orange-100 text-orange-700",
  OTRA: "bg-slate-100 text-slate-600"
};
```

### Formulario (`components/propuestas/propuesta-form.tsx`)

Añadir select de categoría antes del botón de enviar:

```tsx
// Añadir al estado del form:
const [form, setForm] = useState({
  titulo: "",
  descripcion: "",
  autorNombre: defaultAutorNombre,
  autorEmail: defaultAutorEmail,
  autorTelefono: "",
  categoria: "OTRA" as string   // ← añadir
});

// Añadir en el JSX, antes del <div className="flex justify-end">:
<select
  value={form.categoria}
  onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
>
  <option value="PROCESO">Proceso o flujo de trabajo</option>
  <option value="HERRAMIENTA">Nueva herramienta o software</option>
  <option value="COMUNICACION">Comunicación interna</option>
  <option value="INFRAESTRUCTURA">Infraestructura u oficina</option>
  <option value="OTRA">Otra mejora</option>
</select>
```

### API (`app/api/propuestas/route.ts`)

Añadir `categoria` al schema de validación y al create:

```typescript
const createSchema = z.object({
  titulo: z.string().min(1, "Título obligatorio"),
  descripcion: z.string().min(1, "Descripción obligatoria"),
  autorNombre: z.string().min(1, "Nombre obligatorio"),
  autorEmail: z.string().email().optional().or(z.literal("")).optional(),
  autorTelefono: z.string().optional(),
  categoria: z.enum(["PROCESO", "HERRAMIENTA", "COMUNICACION", "INFRAESTRUCTURA", "OTRA"]).default("OTRA")  // ← añadir
});

// En prisma.propuesta.create():
data: {
  // ... campos existentes ...
  categoria: data.categoria  // ← añadir
}
```

### Cards (mostrar categoría)

En `components/propuestas/propuestas-list.tsx` y `propuestas-admin-list.tsx`, añadir badge de categoría en las tarjetas:

```tsx
import { PROPUESTA_CATEGORIA_LABELS, PROPUESTA_CATEGORIA_COLORS } from "@/lib/propuestas";

// En la card, después del badge de estado:
{p.categoria && p.categoria !== "OTRA" && (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROPUESTA_CATEGORIA_COLORS[p.categoria] ?? "bg-slate-100 text-slate-600"}`}>
    {PROPUESTA_CATEGORIA_LABELS[p.categoria] ?? p.categoria}
  </span>
)}
```

---

## M4 — Campo impacto estimado

Permite al autor indicar qué impacto cree que tiene su propuesta.

### Schema

```prisma
enum PropuestaImpacto {
  BAJO
  MEDIO
  ALTO
}

model Propuesta {
  // ...
  impacto  PropuestaImpacto @default(MEDIO)  // ← añadir
}
```

### Migración

```bash
npx prisma migrate dev --name add_propuesta_impacto
```

> Si M3 y M4 se implementan juntos, hacer todo en un solo `migrate dev`:
> ```bash
> npx prisma migrate dev --name add_propuesta_categoria_impacto
> ```

### Constantes

```typescript
export const PROPUESTA_IMPACTO_LABELS: Record<string, string> = {
  BAJO: "Impacto bajo",
  MEDIO: "Impacto medio",
  ALTO: "Impacto alto"
};

export const PROPUESTA_IMPACTO_COLORS: Record<string, string> = {
  BAJO: "bg-slate-100 text-slate-500",
  MEDIO: "bg-amber-100 text-amber-700",
  ALTO: "bg-red-100 text-red-700"
};
```

### Formulario — añadir selector de impacto

```tsx
// Mostrar como 3 botones de radio visually styled:
<div className="space-y-1">
  <p className="text-xs font-medium text-slate-600">Impacto estimado</p>
  <div className="flex gap-2">
    {(["BAJO", "MEDIO", "ALTO"] as const).map(imp => (
      <label key={imp} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        form.impacto === imp
          ? PROPUESTA_IMPACTO_COLORS[imp] + " border-transparent ring-2 ring-amber-400"
          : "border-slate-200 text-slate-500 hover:border-slate-300"
      }`}>
        <input
          type="radio"
          name="impacto"
          value={imp}
          checked={form.impacto === imp}
          onChange={() => setForm(p => ({ ...p, impacto: imp }))}
          className="sr-only"
        />
        {PROPUESTA_IMPACTO_LABELS[imp]}
      </label>
    ))}
  </div>
</div>
```

---

## M5 — UX cards mejoradas

### Vista usuario — tarjeta mejorada (`propuestas-list.tsx`)

Reescribir las tarjetas para que sean más claras visualmente:

```tsx
{propuestas.map(p => {
  const cfg = ESTADO_CONFIG[p.estado];
  return (
    <div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: estado + fecha */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.color}`}>
          {cfg.icon}
          {cfg.label}
        </span>
        <span className="text-[11px] text-slate-400">{formatDateTimeEs(p.createdAt)}</span>
      </div>

      {/* Título */}
      <p className="mb-1.5 text-sm font-semibold leading-snug text-slate-800">{p.titulo}</p>

      {/* Descripción (colapsada) */}
      <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-slate-500">{p.descripcion}</p>

      {/* Categoría + impacto si existen */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {p.categoria && p.categoria !== "OTRA" && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROPUESTA_CATEGORIA_COLORS[p.categoria]}`}>
            {PROPUESTA_CATEGORIA_LABELS[p.categoria]}
          </span>
        )}
        {p.impacto && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROPUESTA_IMPACTO_COLORS[p.impacto]}`}>
            {PROPUESTA_IMPACTO_LABELS[p.impacto]}
          </span>
        )}
      </div>

      {/* Nota del admin si existe */}
      {p.notaAdmin && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <span className="font-semibold">Respuesta:</span> {p.notaAdmin}
        </div>
      )}
    </div>
  );
})}
```

### Estado vacío mejorado

```tsx
<div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-14 text-center">
  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
    <Lightbulb className="h-7 w-7 text-amber-500" />
  </div>
  <p className="mb-1 text-base font-semibold text-slate-700">Sin propuestas todavía</p>
  <p className="mb-5 text-sm text-slate-400 max-w-xs mx-auto">
    ¿Tienes una idea para mejorar la plataforma o los procesos del equipo? Compártela aquí.
  </p>
  <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600">
    <Plus className="mr-1.5 h-4 w-4" /> Nueva propuesta
  </Button>
</div>
```

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `components/layout/app-header.tsx` | M1: link "Propuestas" en nav + menú móvil; M2: link admin + badge |
| `app/(app)/layout.tsx` | M2 (opcional): query count propuestas pendientes |
| `prisma/schema.prisma` | M3: enum `PropuestaCategoria` + campo; M4: enum `PropuestaImpacto` + campo |
| `lib/propuestas.ts` | M3+M4: constantes labels y colores (archivo NUEVO) |
| `components/propuestas/propuesta-form.tsx` | M3: select categoría; M4: radio impacto |
| `app/api/propuestas/route.ts` | M3+M4: zod schema + create con nuevos campos |
| `components/propuestas/propuestas-list.tsx` | M5: cards mejoradas, badges de categoría/impacto |
| `components/propuestas/propuestas-admin-list.tsx` | M5: mostrar categoría/impacto en admin cards |

---

## Orden de ejecución

```
1. M1 + M2 — solo header.tsx, sin BD, 5 min cada uno
   → commit + push → Vercel deploy
   → Ya navegable

2. B007 — fix confirm() en delete (propuestas-admin-list.tsx)
   → solo components, sin BD
   → commit + push

3. M3 + M4 — schema + migración + constantes + form + API + cards
   → npm run build primero
   → commit + push

4. M5 — UX polish de cards
   → commit + push
```

## Verificación antes de push

```bash
cd "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"
npm run build
```

Si hay errores de tipo en propuesta, revisar que el type de `Propuesta` en los componentes
incluya los nuevos campos `categoria` y `impacto` como opcionales (`string | null`).

---

## Notas de contexto

- **Shell:** siempre arranca en OrbeBI. Usar `cd` explícito al APPTICKET.
- **URL local:** `http://127.0.0.1:3000` — NO `localhost`.
- **Deploy:** push a `main` → Vercel auto-deploy (~2 min).
- **DB:** Neon serverless — después de `prisma migrate dev`, commitar la migración generada en `prisma/migrations/`.
- **Auth admin:** `iker.dominguez@entenova.gnosis.com` / `6924`
