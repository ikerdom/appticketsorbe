# Plan de mejoras — AppTickets

Referencia maestra para implementación. Cada punto es autocontenido.
Versión: 2.0 · Fecha: 2026-06-18

---

## Índice y prioridades

| ID | Área | Prioridad | Esfuerzo | Estado |
|----|------|-----------|----------|--------|
| [P0](#p0--fix-bug-crítico-tickets-fantasma) | Fix bug crítico: tickets fantasma | 🔴 CRÍTICO | Bajo (2h) | ✅ HECHO |
| [P1](#p1--upload-de-archivos-real-pdf--imágenes) | Upload real: PDF + imágenes via uploadthing | 🔴 ALTA | Alto (1-2 días) | pendiente |
| [P2](#p2--vista-pública-de-ticket-sin-login) | Vista pública de ticket sin login | 🟠 ALTA | Medio (4h) | ✅ HECHO |
| [P3](#p3--3-admins--acceso-simplificado) | 3 admins + acceso simplificado | 🟠 ALTA | Bajo (1h) | ✅ HECHO |
| [P4](#p4--estadísticas-mejoradas) | Estadísticas mejoradas | 🟡 MEDIA | Medio (6h) | ✅ ya existía |
| [P5](#p5--exportar-incidencias-csv) | Exportar incidencias CSV | 🟡 MEDIA | Bajo (3h) | ✅ HECHO |
| [P6](#p6--ux-general--comodidad) | UX general — comodidad | 🟢 BAJA | Bajo (4h) | ✅ HECHO (Dialog + SLA + urgente checkbox + CRÍTICA pulse) |
| [P7](#p7--sla-por-prioridad) | SLA por prioridad (no hardcoded) | 🟢 BAJA | Bajo (1h) | ✅ HECHO |

**Orden de implementación recomendado:** P0 → P3 → P2 → P1 → P5 → P4 → P7 → P6

---

## P0 — Fix bug crítico: tickets fantasma

**Relacionado con:** BUGS.md → B001

### Síntoma
Al mover un ticket de estado en el kanban, 1-2 segundos después aparecen tickets "fantasma" de un estado antiguo. Requiere refrescar la página para que desaparezcan.

### Causa raíz
`components/kanban/kanban-board.tsx` — la función `backgroundSync()` reemplaza todo el estado React con datos potencialmente stale de Neon (race condition de read-after-write en connection pool serverless).

### Implementación

**Archivo:** `components/kanban/kanban-board.tsx`

1. Añadir import de `useRouter`:
```typescript
import { useRouter } from "next/navigation";  // ya existe en el archivo
```

2. Añadir dentro del componente `KanbanBoard`:
```typescript
const router = useRouter();
```

3. Reemplazar las funciones `backgroundSync` y `scheduleSync` completas:
```typescript
// ELIMINAR todo esto:
async function backgroundSync() { ... }
function scheduleSync() { ... }

// AÑADIR esto:
function scheduleSync() {
  setTimeout(() => router.refresh(), 800);
}
```

4. Eliminar también el import de `useTransition` si solo se usaba para `backgroundSync`.
   Verificar que `isPending` y `startTransition` no se usen en otro sitio — si no se usan, eliminar.

### Qué hace `router.refresh()`
Re-ejecuta el Server Component (page.tsx), que hace una query Prisma directa al primary de Neon. No reemplaza el estado React del kanban — React reconcilia solo los datos que cambiaron. Sin flash, sin revert de estado.

### Test de verificación
1. Abrir kanban con 5+ tickets
2. Arrastrar uno a RESUELTO → confirmar
3. Esperar 3 segundos
4. Verificar que NO aparecen tickets fantasma
5. Refrescar página → estado debe ser el mismo que tras el drag

---

## P1 — Upload de archivos real: PDF + imágenes via uploadthing

**Relacionado con:** BUGS.md → B002, B006

### Objetivo
Que se puedan subir imágenes Y PDFs (y otros archivos comunes) tanto al crear un ticket como desde el detalle. Que funcione en producción en Vercel.

### Estado actual del problema
- En Vercel: solo imágenes via base64 (clipboard/drag). FormData devuelve 501.
- PDFs: imposibles en producción.
- uploadthing ya está en `package.json` (`uploadthing@7.4.4`) pero sin configurar.

### Paso 1 — Configurar uploadthing

**Variables de entorno** (`.env` + Vercel dashboard):
```bash
UPLOADTHING_SECRET=sk_live_...   # Obtenible en uploadthing.com
UPLOADTHING_APP_ID=...
```

**Crear `app/api/uploadthing/core.ts`:**
```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { requireCurrentUser } from "@/lib/data";

const f = createUploadthing();

export const ourFileRouter = {
  ticketAttachment: f({
    image: { maxFileSize: "4MB", maxFileCount: 10 },
    pdf: { maxFileSize: "10MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "10MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "10MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await requireCurrentUser();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Aquí se puede guardar en BD si se quiere trazar uploads sin ticketId
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

**Crear `app/api/uploadthing/route.ts`:**
```typescript
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
```

### Paso 2 — Actualizar `app/api/tickets/[id]/adjuntos/route.ts`

Mantener el path de base64 (para retrocompatibilidad con imágenes pegadas) y añadir path de uploadthing URL:

```typescript
// NUEVO path: cuando el cliente ya subió a uploadthing y manda la URL
if (contentType.includes("application/json")) {
  const body = await request.json();
  
  // Path 1: uploadthing URL (nuevo)
  if (body.uploadthingUrl) {
    const adjunto = await prisma.adjunto.create({
      data: {
        nombre: body.nombre || "archivo",
        tipo: body.tipo || "application/octet-stream",
        tamano: body.tamano || 0,
        url: body.uploadthingUrl,  // URL de CDN uploadthing
        ticketId: ticket.id
      }
    });
    return NextResponse.json({ adjuntos: [adjunto] }, { status: 201 });
  }
  
  // Path 2: base64 imagen (existente — mantener)
  if (body.base64) {
    // ... código existente ...
  }
}

// ELIMINAR el bloque IS_VERCEL que devuelve 501
```

### Paso 3 — Actualizar `components/tickets/new-ticket-form.tsx`

Añadir soporte para PDF y archivos no-imagen en el file picker:

```typescript
// Cambiar el input de archivo:
<input 
  ref={fileInputRef} 
  type="file" 
  accept="image/*,application/pdf,.docx,.xlsx,.zip" 
  multiple 
  className="hidden" 
  onChange={handleFileSelect} 
/>
```

Añadir lógica para archivos no-imagen (no tienen preview, pero sí se listan):
```typescript
interface PendingFile {
  file: File;
  preview: string | null;  // null para no-imágenes
  tipo: "imagen" | "pdf" | "otro";
}
```

Para el upload: usar `useUploadThing` hook de uploadthing en vez de base64:
```typescript
import { useUploadThing } from "@/lib/uploadthing";  // crear este helper
const { startUpload } = useUploadThing("ticketAttachment");

async function uploadPendingFiles(ticketId: string) {
  if (!pendingFiles.length) return;
  const uploaded = await startUpload(pendingFiles.map(f => f.file));
  for (const file of uploaded ?? []) {
    await fetch(`/api/tickets/${ticketId}/adjuntos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadthingUrl: file.url,
        nombre: file.name,
        tipo: file.type,
        tamano: file.size
      })
    });
  }
}
```

### Paso 4 — Actualizar `components/tickets/ticket-detail-view.tsx`

Misma lógica en la vista de detalle: añadir soporte para subir desde detalle usando uploadthing.

Mostrar adjuntos PDF con icono de PDF en vez de `<img>`:
```typescript
function AdjuntoItem({ adjunto }) {
  const isPdf = adjunto.tipo === "application/pdf" || adjunto.nombre.endsWith(".pdf");
  const isImage = adjunto.tipo.startsWith("image/");
  
  if (isImage && !adjunto.url.startsWith("http")) {
    // base64 legacy
    return <img src={adjunto.url} ... />;
  }
  if (isImage) {
    return <img src={adjunto.url} ... />;
  }
  if (isPdf) {
    return (
      <a href={adjunto.url} target="_blank" rel="noopener">
        <FileText className="h-8 w-8 text-red-500" />
        <span>{adjunto.nombre}</span>
      </a>
    );
  }
  // Otros archivos
  return <a href={adjunto.url} target="_blank">{adjunto.nombre}</a>;
}
```

### Paso 5 — Helper uploadthing cliente

**Crear `lib/uploadthing.ts`:**
```typescript
import { generateUploadButton, generateUploadDropzone, generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

### Archivos a crear/modificar
- `app/api/uploadthing/core.ts` — NUEVO
- `app/api/uploadthing/route.ts` — NUEVO
- `lib/uploadthing.ts` — NUEVO
- `app/api/tickets/[id]/adjuntos/route.ts` — MODIFICAR
- `components/tickets/new-ticket-form.tsx` — MODIFICAR
- `components/tickets/ticket-detail-view.tsx` — MODIFICAR

---

## P2 — Vista pública de ticket sin login

### Objetivo
Cualquiera con el enlace puede ver el estado de un ticket sin estar logueado. Útil para:
- Compartir estado con alguien externo
- El propio creador ver el estado rápido desde móvil sin sesión

### Nuevas rutas a crear

```
app/public/
  layout.tsx         ← layout mínimo sin auth (solo logo + color empresa)
  tickets/
    [id]/
      page.tsx       ← ver por ID interno
    t/
      [numero]/
        page.tsx     ← alias por número de ticket (más legible)
```

### Actualizar middleware

En `middleware.ts`, la ruta `/public/*` ya está considerada como estática (`isStaticPath` incluye `/public`). Verificar que funciona — si no, añadir explícitamente:

```typescript
const PUBLIC_PATHS = ["/login", "/forbidden", "/public"];
```

### `app/public/tickets/[id]/page.tsx`

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PublicTicketPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: {
      numero: true,
      titulo: true,
      estado: true,
      prioridad: true,
      categoria: true,
      categoriaCustom: true,
      createdAt: true,
      updatedAt: true,
      resueltoAt: true,
      empresaOrigen: { select: { nombre: true, color: true } },
      destinos: { include: { empresa: { select: { nombre: true, color: true } } } },
      comentarios: {
        select: { contenido: true, createdAt: true, autor: { select: { nombre: true, name: true } } },
        orderBy: { createdAt: "asc" }
      }
      // NO incluir: contactoNombre, contactoEmail, notas, historial completo
    }
  });

  if (!ticket) notFound();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header con número, estado y prioridad */}
      {/* Empresa afectada con color */}
      {/* Comentarios públicos */}
      {/* Footer: "Powered by AppTickets · Entenova" */}
    </div>
  );
}
```

### `app/public/tickets/t/[numero]/page.tsx`

```typescript
// Redirect al ID interno
const ticket = await prisma.ticket.findUnique({ where: { numero: parseInt(params.numero) }, select: { id: true } });
if (!ticket) notFound();
redirect(`/public/tickets/${ticket.id}`);
```

### Actualizar botón de compartir

En `components/kanban/sortable-ticket-card.tsx`, cambiar el link de compartir:
```typescript
// ANTES (URL privada):
const shareUrl = `${window.location.origin}/tickets/${ticket.id}`;

// DESPUÉS (URL pública):
const shareUrl = `${window.location.origin}/public/tickets/t/${ticket.numero}`;
```

Igual en `components/tickets/ticket-detail-view.tsx` donde esté el botón de share.

---

## P3 — 3 admins + acceso simplificado

### Objetivo
Configurar los 3 admins correctos y asegurarse de que el acceso es lo más simple posible.

### 1. Actualizar `prisma/seed.ts`

Localizar el array de admins en seed.ts y añadir los 2 que faltan:

```typescript
const admins = [
  {
    email: "iker.dominguez@entenova.gnosis.com",
    nombre: "Iker Domínguez",
    empresaNombre: "Entenova"
  },
  {
    email: "SEGUNDO_ADMIN@dominio.com",  // ← RELLENAR
    nombre: "Nombre Admin 2",            // ← RELLENAR
    empresaNombre: "ORBE"                // ← RELLENAR según empresa
  },
  {
    email: "TERCER_ADMIN@dominio.com",   // ← RELLENAR
    nombre: "Nombre Admin 3",            // ← RELLENAR
    empresaNombre: "Editorial CEP"       // ← RELLENAR según empresa
  }
];
```

Después de editar: `npm run db:seed` (el seed es idempotente).

### 2. Verificar dominios en .env y Vercel

Confirmar que `.env` y las Vercel env vars tienen todos los dominios:
```
ALLOWED_EMAIL_DOMAINS="orbe.es,entenova.com,entenova.gnosis.com,veprix.com,editorialcep.com,bn-tic.es"
```

### 3. Mejorar mensajes de error en login

En `app/(auth)/login/` — mejorar los mensajes:

| Situación | Mensaje actual | Mensaje mejorado |
|-----------|---------------|-----------------|
| Dominio no autorizado | genérico | "Este email no pertenece a ninguna empresa autorizada. Usa tu email corporativo." |
| Usuario desactivado | genérico | "Tu cuenta está desactivada. Contacta con tu administrador." |
| Contraseña incorrecta (admin) | genérico | "Contraseña incorrecta." |
| Email no encontrado para usuario que debería poder entrar | error | "Introduce tu email corporativo para acceder." |

### 4. Primera vez que entra un usuario nuevo

Cuando un usuario con email de dominio válido entra por primera vez:
- Se crea automáticamente → ✓ ya funciona
- Ve pantalla de bienvenida → ✓ ya funciona
- Su empresa se asigna automáticamente por dominio → verificar que funciona con todos los dominios incluyendo `bn-tic.es`

---

## P4 — Estadísticas mejoradas

### Objetivo
Dashboard de admin útil con métricas reales, no solo contadores.

### Cards KPI (nuevas)

Añadir en la parte superior del dashboard admin 4 cards de métricas clave:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Tiempo medio   │ │  Sin asignar    │ │  SLA en rojo    │ │  Críticos       │
│  resolución     │ │                 │ │  (>72h open)    │ │  abiertos       │
│    18.4h       │ │       7         │ │       3         │ │       1         │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

Query para tiempo medio:
```typescript
const resolved = await prisma.ticket.findMany({
  where: { resueltoAt: { not: null }, createdAt: { gte: startDate } },
  select: { createdAt: true, resueltoAt: true }
});
const avgHours = resolved.length
  ? resolved.reduce((sum, t) => sum + (t.resueltoAt!.getTime() - t.createdAt.getTime()) / 3600000, 0) / resolved.length
  : null;
```

### Gráfico de barras: tickets por semana

Usar `recharts` ya instalado. Datos: tickets creados por semana, últimas 8 semanas.

```typescript
// Query: agrupar por semana
const semanas = await prisma.$queryRaw`
  SELECT 
    date_trunc('week', "createdAt") as semana,
    COUNT(*) as total,
    SUM(CASE WHEN estado = 'RESUELTO' THEN 1 ELSE 0 END) as resueltos
  FROM "Ticket"
  WHERE "createdAt" >= NOW() - INTERVAL '8 weeks'
  GROUP BY semana
  ORDER BY semana
`;
```

Mostrar como `<BarChart>` con dos series: "Creados" y "Resueltos".

### Tabla por empresa con métricas

| Empresa | Abiertos | En curso | Resueltos | Tiempo medio |
|---------|----------|----------|-----------|-------------|
| ORBE | 3 | 2 | 45 | 12.3h |
| Entenova | 1 | 0 | 12 | 8.7h |
| ... | | | | |

### Filtro de rango de fechas

Añadir selector: Últimos 7 días / 30 días / 90 días / Todo el tiempo.

El filtro afecta a todos los datos del dashboard.

### Archivos a modificar
- `app/(app)/admin/dashboard/page.tsx` — añadir queries de stats
- `components/admin/admin-dashboard-view.tsx` — añadir cards KPI + gráficos

---

## P5 — Exportar incidencias CSV

### Objetivo
Admin descarga todos los tickets como CSV para análisis en Excel.

### Endpoint nuevo

`GET /api/admin/export/tickets`

Query params opcionales: `estado`, `empresaId`, `desde` (ISO date), `hasta` (ISO date)

**Respuesta:** `Content-Type: text/csv; charset=utf-8`
**Nombre archivo sugerido:** `incidencias_2026-06-18.csv`

### Campos del CSV

```
Número;Fecha creación;Título;Estado;Prioridad;Categoría;
Empresa origen;Empresa destino;Creado por;Asignado a;
Horas dedicadas;Fecha resolución;Nota resolución
```

### Encoding para Excel español

Añadir BOM UTF-8 al inicio para que Excel lo abra correctamente:

```typescript
export async function GET(request: NextRequest) {
  const user = await requireCurrentUser();
  if (user.rol !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const tickets = await prisma.ticket.findMany({
    // aplicar filtros de query params
    include: {
      empresaOrigen: true,
      empresaDestino: true,
      creador: { select: { email: true, nombre: true, name: true } },
      asignado: { select: { email: true, nombre: true, name: true } }
    },
    orderBy: { numero: "asc" }
  });

  const BOM = "﻿";  // UTF-8 BOM para Excel
  const SEP = ";";       // Punto y coma para Excel español

  const header = ["Número", "Fecha creación", "Título", "Estado", "Prioridad",
    "Categoría", "Empresa origen", "Empresa destino", "Creado por",
    "Asignado a", "Horas dedicadas", "Fecha resolución", "Nota resolución"
  ].join(SEP);

  const rows = tickets.map(t => [
    t.numero,
    t.createdAt.toISOString().split("T")[0],
    `"${t.titulo.replace(/"/g, '""')}"`,
    t.estado,
    t.prioridad,
    t.categoriaCustom || t.categoria,
    t.empresaOrigen.nombre,
    t.empresaDestino.nombre,
    t.creador.nombre || t.creador.email,
    t.asignado ? (t.asignado.nombre || t.asignado.email) : "",
    t.horasDedicadas ?? "",
    t.resueltoAt ? t.resueltoAt.toISOString().split("T")[0] : "",
    `"${(t.notaResolucion || "").replace(/"/g, '""')}"`
  ].join(SEP));

  const csv = BOM + [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="incidencias_${new Date().toISOString().split("T")[0]}.csv"`
    }
  });
}
```

### Botón en dashboard admin

En `components/admin/admin-dashboard-view.tsx`, añadir botón "Exportar CSV" que abre la URL del endpoint:

```typescript
<a href="/api/admin/export/tickets" download>
  <Button variant="outline" size="sm">
    <Download className="h-4 w-4 mr-2" />
    Exportar CSV
  </Button>
</a>
```

### Archivos a crear/modificar
- `app/api/admin/export/route.ts` — NUEVO
- `components/admin/admin-dashboard-view.tsx` — añadir botón

---

## P6 — UX general — comodidad

### P6.1 — Reemplazar `window.confirm()` por Dialog de shadcn

**Archivo:** `components/kanban/kanban-board.tsx`

Crear un estado para el dialog de confirmación:
```typescript
const [confirmDialog, setConfirmDialog] = useState<{
  ticketId: string;
  targetEstado: Estado;
} | null>(null);
```

Cuando el usuario arrastra a RESUELTO: en vez de `window.confirm()`, setear el estado del dialog.
El dialog muestra:
- Título: "¿Marcar como resuelto?"
- Texto: "Esta acción notificará al creador y cerrará el ticket."
- Botón cancelar + botón confirmar

### P6.2 — Hint del command palette visible

**Archivo:** `components/layout/app-header.tsx`

Añadir junto al icono de búsqueda (o debajo) el texto: `/ para buscar` en texto gris pequeño.
O en tooltip del botón de búsqueda.

### P6.3 — Badge de contador en tabs de móvil

**Archivo:** `components/kanban/kanban-board.tsx`

```typescript
// Antes:
<TabsTrigger>ABIERTO ({grouped.ABIERTO.length})</TabsTrigger>

// Ya existe, verificar que sea visible en móvil
```

### P6.4 — Estado vacío más claro

**Archivo:** `components/kanban/kanban-board.tsx`

Cuando no hay tickets con los filtros activos:
- Mensaje: "No hay tickets con estos filtros"
- Botón: "Limpiar filtros" (ya existe pero mejorar visibilidad)

Cuando no hay tickets en absoluto:
- Mensaje grande: "Todo al día"
- Botón destacado: "Crear primer ticket"

### P6.5 — Campo "¿Es urgente?" en formulario

**Archivo:** `components/tickets/new-ticket-form.tsx`

Añadir checkbox grande y visible:
```typescript
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    onChange={(e) => {
      if (e.target.checked) form.setValue("prioridad", "ALTA");
    }}
  />
  <span className="font-medium text-red-600">⚠ Es urgente</span>
</label>
```
Al marcar → pone la prioridad en ALTA automáticamente. El usuario puede ajustar después si quiere CRÍTICA.

---

## P7 — SLA por prioridad (no hardcodeado)

**Relacionado con:** BUGS.md → B004

**Archivo:** `components/kanban/sortable-ticket-card.tsx`

Localizar dónde se calculan las horas del SLA y reemplazar el valor fijo por una constante por prioridad:

```typescript
const SLA_HORAS: Record<string, number> = {
  CRITICA: 4,
  ALTA: 24,
  MEDIA: 72,
  BAJA: 120   // 5 días
};

// En el cálculo del timer:
const slaLimite = SLA_HORAS[ticket.prioridad] ?? 72;
const horasTranscurridas = (Date.now() - new Date(ticket.createdAt).getTime()) / 3600000;
const estaEnRojo = ticket.estado !== "RESUELTO" && horasTranscurridas >= slaLimite;
const estaEnAmbar = ticket.estado !== "RESUELTO" && horasTranscurridas >= slaLimite * 0.75;
```

---

## Cosas que NO se cambian

- Stack tecnológico (Next.js 14, Prisma, Neon, Vercel)
- Sistema de autenticación (funciona bien tal cual)
- Modelo de base de datos (no migraciones salvo P1 si es necesario)
- Sin notificaciones por email
- Sin integraciones externas (Slack, Teams, etc.)

---

## Cómo usar este documento en otro chat

Cada sección es autocontenida. Ejemplo de prompt para implementar:

> "Implementa el punto P0 del archivo PLAN_MEJORAS.md ubicado en C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET. Lee también SPEC_FUNCIONAL.md para contexto y BUGS.md para la causa raíz del bug."

El agente puede leer estos ficheros y ejecutar los cambios sin necesitar más contexto de esta conversación.
