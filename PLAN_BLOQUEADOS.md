# Plan — Estado BLOQUEADO + Nota obligatoria al resolver

Dos features relacionadas: tickets bloqueados por dependencia externa,
y nota de resolución obligatoria al cerrar un ticket.

Versión: 1.0 · Fecha: 2026-07-10

---

## Resumen de cambios

| ID | Cambio | Esfuerzo | Prioridad |
|----|--------|----------|-----------|
| [B1](#b1--estado-bloqueado-en-schema) | Añadir `BLOQUEADO` al enum `Estado` | 15 min | 🔴 CRÍTICO |
| [B2](#b2--campo-motivobloqueo) | Campo `motivoBloqueo` en Ticket | 5 min | 🔴 CRÍTICO |
| [B3](#b3--api--lógica-de-bloqueo) | API route: aceptar BLOQUEADO + desbloqueo | 20 min | 🔴 CRÍTICO |
| [B4](#b4--columna-bloqueado-en-kanban) | 4ª columna en kanban + dialog de bloqueo | 1h | 🔴 CRÍTICO |
| [B5](#b5--nota-obligatoria-al-resolver) | Nota obligatoria al marcar RESUELTO | 30 min | 🟠 ALTA |
| [B6](#b6--mostrar-motivo-en-tarjeta-bloqueada) | Mostrar motivo en tarjeta bloqueada | 20 min | 🟡 MEDIA |
| [B7](#b7--fecha-más-visible-en-tarjeta) | Fecha al header de tarjeta (con icono Calendar) | 15 min | 🟡 MEDIA |

**Orden:** B1 → B2 → migración → B3 → B4 → B5 → B6 → B7 → build → push

---

## B1 — Estado BLOQUEADO en schema

**Archivo:** `prisma/schema.prisma`

```prisma
// ANTES:
enum Estado {
  ABIERTO
  EN_CURSO
  RESUELTO
}

// DESPUÉS:
enum Estado {
  ABIERTO
  EN_CURSO
  BLOQUEADO
  RESUELTO
}
```

---

## B2 — Campo motivoBloqueo

**Archivo:** `prisma/schema.prisma` — modelo `Ticket`

```prisma
model Ticket {
  // ... campos existentes ...
  notaResolucion    String?  @db.Text      // ya existe
  motivoBloqueo     String?  @db.Text      // ← AÑADIR
  // ...
}
```

### Migración (después de B1 y B2)

```bash
cd "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"
npx prisma migrate dev --name add_bloqueado_estado_y_motivo
```

**Importante:** commitear el archivo generado en `prisma/migrations/` junto con el código.

---

## B3 — API: lógica de bloqueo

**Archivo:** `app/api/tickets/[id]/estado/route.ts`

### Cambios en el tipo del body

```typescript
// ANTES:
const body = (await request.json()) as {
  action?: TicketAction;
  estado?: "ABIERTO" | "EN_CURSO" | "RESUELTO";
  horasDedicadas?: number;
  notaResolucion?: string;
};

// DESPUÉS:
const body = (await request.json()) as {
  action?: TicketAction;
  estado?: "ABIERTO" | "EN_CURSO" | "BLOQUEADO" | "RESUELTO";
  horasDedicadas?: number;
  notaResolucion?: string;
  motivoBloqueo?: string;
};
```

### Cambio en la guardia de RESUELTO permanente

```typescript
// ANTES (línea 32):
if (ticket.estado === "RESUELTO" && action !== "archive") {
  return NextResponse.json({ error: "Un ticket resuelto no puede cambiar de estado." }, { status: 403 });
}

// Sin cambio — RESUELTO sigue siendo permanente.
// BLOQUEADO sí puede cambiar de estado.
```

### Cambio en el bloque `else if (action === "resolve")`

```typescript
} else if (action === "resolve") {
  // AÑADIR validación de nota obligatoria:
  if (!body.notaResolucion?.trim()) {
    return NextResponse.json(
      { error: "Es obligatorio añadir una nota de resolución." },
      { status: 400 }
    );
  }
  data = {
    estado: "RESUELTO",
    resueltoAt: new Date(),
    motivoBloqueo: null,   // ← limpiar si estaba bloqueado
    ...(body.horasDedicadas != null ? { horasDedicadas: body.horasDedicadas } : {}),
    notaResolucion: body.notaResolucion
  };
  // ...
```

### Añadir manejo de BLOQUEADO en el bloque `else` (set_estado)

```typescript
} else {
  const estado = body.estado;
  if (!estado) {
    return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
  }

  if (estado === "EN_CURSO") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Solo un administrador puede marcar un ticket en curso." }, { status: 403 });
    }
    data = { estado, asignadoId: ticket.asignadoId ?? user.id, resueltoAt: null, motivoBloqueo: null };
  } else if (estado === "ABIERTO") {
    data = { estado, asignadoId: null, resueltoAt: null, motivoBloqueo: null };
  } else if (estado === "BLOQUEADO") {
    // NUEVO — validar motivo obligatorio
    if (!body.motivoBloqueo?.trim()) {
      return NextResponse.json(
        { error: "Es obligatorio indicar el motivo del bloqueo." },
        { status: 400 }
      );
    }
    data = { estado, motivoBloqueo: body.motivoBloqueo.trim() };
  } else {
    // RESUELTO via set_estado directo: no debería usarse, pero por seguridad:
    data = { estado, resueltoAt: new Date() };
  }
  accionHistorial = "ESTADO_CAMBIADO";
  detalle = { de: ticket.estado, a: estado, motivoBloqueo: body.motivoBloqueo };
}
```

---

## B4 — Columna BLOQUEADO en kanban

**Archivo:** `components/kanban/kanban-board.tsx`

### Paso 1 — Añadir BLOQUEADO a los estados del kanban

```typescript
// ANTES (buscar la constante de estados o el array de columnas):
const ESTADOS = ["ABIERTO", "EN_CURSO", "RESUELTO"] as const;
type Estado = typeof ESTADOS[number];

// DESPUÉS:
const ESTADOS = ["ABIERTO", "EN_CURSO", "BLOQUEADO", "RESUELTO"] as const;
type Estado = typeof ESTADOS[number];
```

Buscar también donde se define la config de columnas (buscar `ESTADO_LABELS` o similar):
```typescript
// Añadir BLOQUEADO a la config visual de columnas:
const ESTADO_CONFIG = {
  ABIERTO:   { label: "Abierto",     color: "border-slate-200", headerColor: "bg-slate-50", dot: "bg-slate-400" },
  EN_CURSO:  { label: "En curso",    color: "border-amber-200",  headerColor: "bg-amber-50",  dot: "bg-amber-500" },
  BLOQUEADO: { label: "Bloqueado",   color: "border-red-200",    headerColor: "bg-red-50",    dot: "bg-red-500" },  // ← NUEVO
  RESUELTO:  { label: "Resuelto",    color: "border-emerald-200",headerColor: "bg-emerald-50",dot: "bg-emerald-500" },
};
```

### Paso 2 — Separar los estados de confirmación

El kanban actualmente usa `confirmPending` solo para RESUELTO. Hay que añadir un estado separado para BLOQUEADO:

```typescript
// AÑADIR junto a confirmPending:
const [blockPending, setBlockPending] = useState<{
  ticketId: string;
  previous: TicketCardData[];
} | null>(null);
const [motivoBloqueo, setMotivoBloqueo] = useState("");

// El confirmPending existente pasa a ser solo para RESUELTO:
const [confirmPending, setConfirmPending] = useState<{
  ticketId: string;
  targetEstado: Estado;
  previous: TicketCardData[];
} | null>(null);
const [notaResolucion, setNotaResolucion] = useState("");
```

### Paso 3 — Modificar onDragEnd para interceptar BLOQUEADO

```typescript
// ANTES:
if (targetEstado === "RESUELTO") {
  setTickets(tickets.map((t) =>
    t.id === ticketId ? { ...t, estado: targetEstado, resueltoAt: now, updatedAt: now } : t
  ));
  setConfirmPending({ ticketId, targetEstado, previous });
  return;
}

// DESPUÉS — interceptar también BLOQUEADO:
if (targetEstado === "BLOQUEADO") {
  // Optimistic update
  setTickets(tickets.map((t) =>
    t.id === ticketId ? { ...t, estado: "BLOQUEADO", updatedAt: now } : t
  ));
  setMotivoBloqueo("");  // limpiar campo
  setBlockPending({ ticketId, previous });
  return;
}

if (targetEstado === "RESUELTO") {
  setTickets(tickets.map((t) =>
    t.id === ticketId ? { ...t, estado: targetEstado, resueltoAt: now, updatedAt: now } : t
  ));
  setNotaResolucion("");  // limpiar campo
  setConfirmPending({ ticketId, targetEstado, previous });
  return;
}
```

### Paso 4 — Función confirmBlock

```typescript
const confirmBlock = useCallback(async () => {
  if (!blockPending) return;
  if (!motivoBloqueo.trim()) return; // el botón estará disabled, pero por seguridad

  const { ticketId, previous } = blockPending;
  setBlockPending(null);

  const response = await fetch(`/api/tickets/${ticketId}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado: "BLOQUEADO", motivoBloqueo: motivoBloqueo.trim() })
  });

  if (!response.ok) {
    setTickets(previous);
    const body = await response.json().catch(() => ({ error: "No se pudo bloquear el ticket" }));
    toast.error(body.error ?? "No se pudo bloquear el ticket");
    return;
  }

  toast.success("Ticket marcado como bloqueado");
  scheduleSync();
}, [blockPending, motivoBloqueo, scheduleSync]);

const cancelBlock = useCallback(() => {
  if (!blockPending) return;
  setTickets(blockPending.previous);
  setBlockPending(null);
  setMotivoBloqueo("");
}, [blockPending]);
```

### Paso 5 — Dialog de bloqueo (JSX)

Añadir junto al Dialog existente de RESUELTO:

```tsx
{/* Dialog BLOQUEADO */}
<Dialog
  open={blockPending !== null}
  onClose={cancelBlock}
  title="¿Bloquear este ticket?"
  description="Indica el motivo del bloqueo. Será visible para el creador del ticket."
>
  <Textarea
    value={motivoBloqueo}
    onChange={e => setMotivoBloqueo(e.target.value)}
    placeholder="Ej: La web está en mantenimiento hasta el lunes. Pendiente de que el proveedor responda..."
    rows={3}
    autoFocus
    className="mb-3"
  />
  <DialogActions>
    <Button type="button" variant="outline" onClick={cancelBlock}>
      Cancelar
    </Button>
    <Button
      type="button"
      disabled={!motivoBloqueo.trim()}
      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
      onClick={confirmBlock}
    >
      Bloquear ticket
    </Button>
  </DialogActions>
</Dialog>
```

**Import a añadir:** `import { Textarea } from "@/components/ui/textarea";`

---

## B5 — Nota obligatoria al resolver

**Archivo:** `components/kanban/kanban-board.tsx`

### Modificar el Dialog de RESUELTO existente

Actualmente el dialog solo tiene un texto estático. Hay que añadir un Textarea para la nota:

```typescript
// ANTES — confirmResolve envía solo { estado: "RESUELTO" }:
const confirmResolve = useCallback(async () => {
  if (!confirmPending) return;
  const { ticketId, targetEstado, previous } = confirmPending;
  setConfirmPending(null);

  const response = await fetch(`/api/tickets/${ticketId}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado: targetEstado })
  });
  // ...

// DESPUÉS — confirmResolve usa action "resolve" con notaResolucion:
const confirmResolve = useCallback(async () => {
  if (!confirmPending) return;
  if (!notaResolucion.trim()) return;

  const { ticketId, previous } = confirmPending;
  setConfirmPending(null);

  const response = await fetch(`/api/tickets/${ticketId}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resolve", notaResolucion: notaResolucion.trim() })
  });

  if (!response.ok) {
    setTickets(previous);
    const body = await response.json().catch(() => ({ error: "No se pudo resolver el ticket" }));
    toast.error(body.error ?? "No se pudo resolver el ticket");
    return;
  }

  toast.success("Ticket marcado como resuelto");
  scheduleSync();
}, [confirmPending, notaResolucion, scheduleSync]);
```

### Modificar el Dialog de RESUELTO en el JSX

```tsx
{/* Dialog RESUELTO — MODIFICADO */}
<Dialog
  open={confirmPending !== null}
  onClose={cancelResolve}
  title="¿Marcar como resuelto?"
  description="Añade una nota explicando cómo se resolvió. El creador la recibirá como respuesta."
>
  <Textarea
    value={notaResolucion}
    onChange={e => setNotaResolucion(e.target.value)}
    placeholder="Ej: Se actualizó el permiso del usuario. Se reinició el servicio y verificamos que funciona correctamente..."
    rows={3}
    autoFocus
    className="mb-3"
  />
  <DialogActions>
    <Button type="button" variant="outline" onClick={cancelResolve}>
      Cancelar
    </Button>
    <Button
      type="button"
      disabled={!notaResolucion.trim()}
      className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
      onClick={confirmResolve}
    >
      Marcar resuelto
    </Button>
  </DialogActions>
</Dialog>
```

---

## B6 — Mostrar motivo en tarjeta bloqueada

**Archivo:** `components/kanban/sortable-ticket-card.tsx`

Añadir badge y motivo visible en tarjetas con estado BLOQUEADO.

```typescript
// Añadir motivoBloqueo al tipo TicketCardData (si no está ya)
// En types/ticket.ts o donde esté el tipo:
motivoBloqueo?: string | null;
```

En la tarjeta, justo debajo del título:
```tsx
{ticket.estado === "BLOQUEADO" && ticket.motivoBloqueo && (
  <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5">
    <Lock className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
    <p className="text-[11px] leading-snug text-red-600">{ticket.motivoBloqueo}</p>
  </div>
)}
```

**Import:** `import { Lock } from "lucide-react";`

### SLA en tickets BLOQUEADOS

En la función `getSlaStatus`, ignorar tickets bloqueados (el tiempo bloqueado no debería contar):

```typescript
function getSlaStatus(createdAt: Date, estado: string, prioridad: string): ... {
  if (estado === "RESUELTO" || estado === "BLOQUEADO") return null;  // ← añadir BLOQUEADO
  // ...
}
```

---

## B7 — Fecha más visible en tarjeta

**Archivo:** `components/kanban/sortable-ticket-card.tsx`

**Problema actual:** La fecha está en la línea del badge de empresa como `text-[11px] text-slate-400` — compite visualmente y es casi invisible.

**Fix:** Mover la fecha al header de la tarjeta (fila superior), junto al número de ticket, con icono de calendario. Reemplazar el texto relativo por uno más visible.

```tsx
// ANTES — header de la tarjeta (líneas 98-118):
<div className="mb-2.5 flex items-center justify-between gap-2">
  <div className="flex items-center gap-1.5">
    {ticket.unread && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
    <span className="font-mono text-[10px] font-bold text-slate-400">
      #{String(ticket.numero).padStart(4, "0")}
    </span>
  </div>
  <div className="flex items-center gap-1.5">
    {/* SLA + prioridad */}
  </div>
</div>

// DESPUÉS — añadir fecha junto al número, con icono:
import { Calendar } from "lucide-react"; // añadir al import existente

<div className="mb-2.5 flex items-center justify-between gap-2">
  <div className="flex items-center gap-1.5">
    {ticket.unread && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
    <span className="font-mono text-[10px] font-bold text-slate-400">
      #{String(ticket.numero).padStart(4, "0")}
    </span>
    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
      <Calendar className="h-2.5 w-2.5" />
      {formatRelativeEs(ticket.createdAt)}
    </span>
  </div>
  <div className="flex items-center gap-1.5">
    {/* SLA + prioridad — sin cambios */}
  </div>
</div>
```

**Eliminar la fecha de la línea inferior** (línea 147) donde ahora duplicaría:
```tsx
// ANTES:
<div className="flex items-center justify-between gap-2">
  <div>...badge empresa...</div>
  <span className="text-[11px] text-slate-400">{formatRelativeEs(ticket.createdAt)}</span>
</div>

// DESPUÉS — quitar el span de fecha de ahí:
<div className="flex items-center justify-between gap-2">
  <div>...badge empresa...</div>
  {/* fecha eliminada de aquí — ya está en el header */}
</div>
```

**Para tarjetas BLOQUEADAS** — mostrar también la fecha de bloqueo en el banner rojo:
```tsx
{ticket.estado === "BLOQUEADO" && ticket.motivoBloqueo && (
  <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5">
    <Lock className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-red-600">Bloqueado · {formatRelativeEs(ticket.updatedAt)}</p>
      <p className="text-[11px] leading-snug text-red-500">{ticket.motivoBloqueo}</p>
    </div>
  </div>
)}
```

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `prisma/schema.prisma` | B1+B2: enum `BLOQUEADO` + campo `motivoBloqueo` |
| `app/api/tickets/[id]/estado/route.ts` | B3: aceptar BLOQUEADO, validar motivo + nota resolución obligatoria |
| `components/kanban/kanban-board.tsx` | B4: 4ª columna, estados separados, dialog bloqueo; B5: dialog resolve con nota |
| `components/kanban/sortable-ticket-card.tsx` | B6: badge motivo, SLA pause en BLOQUEADO; B7: fecha en header |
| `types/ticket.ts` (o donde esté el tipo) | B6: añadir `motivoBloqueo` al tipo de tarjeta |

---

## Orden de ejecución

```
1. Editar schema.prisma (B1 + B2 en un solo edit)
2. npx prisma migrate dev --name add_bloqueado_estado_y_motivo
   → commitear la migración generada en prisma/migrations/
3. Editar estado route.ts (B3)
4. Editar kanban-board.tsx (B4 + B5 juntos — mismo archivo)
5. Editar sortable-ticket-card.tsx (B6)
6. npm run build
7. git add + commit + push → Vercel deploy
```

## Verificación manual post-deploy

1. Crear un ticket de prueba
2. Arrastrarlo a BLOQUEADO → debe aparecer dialog pidiendo motivo
3. Intentar confirmar con campo vacío → botón disabled
4. Rellenar motivo → confirmar → tarjeta muestra badge rojo con el motivo
5. Arrastrar ticket BLOQUEADO a EN_CURSO → se mueve sin dialog, motivo desaparece
6. Arrastrar a RESUELTO → debe aparecer dialog pidiendo nota de resolución
7. Intentar confirmar vacío → botón disabled
8. Rellenar nota → marcar resuelto → ticket se cierra con la nota guardada

---

## Notas de contexto

- **Dialog existente:** `components/ui/dialog.tsx` — API: `<Dialog open onClose title description><DialogActions>`
- **Textarea existente:** `components/ui/textarea.tsx` — import directo
- **Shell:** siempre arranca en OrbeBI. Usar `cd "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET"` explícito.
- **URL local:** `http://127.0.0.1:3000` — NO `localhost`.
- **Deploy:** push a `main` → Vercel auto-deploy (~2 min).
- **Migración:** Neon serverless acepta el enum directamente. No hay que hacer backup previo.
