# AppTickets — Guía para Claude

Sistema interno de gestión de incidencias multiempresa.
Stack: Next.js 14 · Prisma · PostgreSQL Neon · Tailwind + shadcn/ui · Vercel

---

## Lo primero que debes leer

Antes de tocar código, lee siempre estos documentos en este orden:

| Doc | Qué contiene | Cuándo leer |
|-----|-------------|-------------|
| **Este fichero** | Contexto rápido, stack, comandos, convenciones | Siempre, primero |
| [SPEC_FUNCIONAL.md](./SPEC_FUNCIONAL.md) | Cómo funciona todo: flujos, permisos, estados | Cuando no sepas qué debe hacer algo |
| [BUGS.md](./BUGS.md) | Bugs conocidos con causa raíz y fix | Antes de arreglar cualquier bug |
| [PLAN_MEJORAS.md](./PLAN_MEJORAS.md) | Mejoras planificadas con código exacto | Cuando vayas a implementar una feature |
| [PLAN_PROPUESTAS.md](./PLAN_PROPUESTAS.md) | Plan módulo Propuestas de Mejora | Cuando trabajes en el módulo de propuestas |
| [PLAN_BLOQUEADOS.md](./PLAN_BLOQUEADOS.md) | Estado BLOQUEADO + nota obligatoria al resolver | Cuando implementes bloqueos de tickets |
| [PLAN_EDITOR_RICO.md](./PLAN_EDITOR_RICO.md) | Editor rico con imágenes inline (estilo Jira) — completo (R1-R9) | Referencia si tocas el editor o los adjuntos huérfanos |
| [README.md](./README.md) | Setup inicial, deploy, comandos | Para arrancar el proyecto |

---

## Contexto rápido del proyecto

**¿Qué es?** App web interna donde empleados de empresas del grupo crean tickets de soporte. Admins los gestionan en un kanban.

**Empresas:** Entenova · ORBE · Editorial CEP · Veprix · BN-TIC

**Roles:**
- `USER` — entra solo con email corporativo (sin contraseña), ve sus tickets
- `ADMIN` — email + contraseña global, ve y gestiona todo

**Flujo principal:** Usuario crea ticket → Admin lo ve en kanban → Admin mueve de ABIERTO → EN_CURSO → RESUELTO

---

## Paths importantes

```
Proyecto local:  C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET
GitHub:          https://github.com/ikerdom/appticketsorbe
Branch main:     main
Deploy:          Vercel — push a main dispara deploy automático (~2 min)
DB:              PostgreSQL en Neon (serverless)
```

**IMPORTANTE:** El shell siempre arranca en el directorio de OrbeBI, no en APPTICKET.
Usar siempre rutas absolutas o `cd` explícito:
```bash
cd "C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET" && <comando>
```

---

## Comandos habituales

```bash
npm run dev          # Arrancar local → http://127.0.0.1:3000 (siempre 127.0.0.1, NO localhost)
npm run build        # Verificar que compila antes de push
npm run lint         # Lint
npm run setup        # prisma generate + migrate deploy + seed (idempotente)
npm run db:seed      # Solo seed
npm run db:migrate   # Nueva migración (dev)
npm run test         # Vitest
```

---

## Estructura de carpetas clave

```
app/
  (app)/           ← páginas protegidas (dashboard, tickets, admin…)
  (auth)/          ← login, recuperar, cambiar-password
  api/             ← endpoints REST
  public/          ← (planificado) páginas sin auth

components/
  kanban/          ← KanbanBoard + SortableTicketCard
  tickets/         ← formulario nuevo ticket, detalle, lifecycle
  layout/          ← header, navbar, command palette, notificaciones
  admin/           ← dashboard admin, tablas gestión
  portal/          ← vista usuario normal
  ui/              ← componentes shadcn

lib/
  auth/            ← sesiones, cookies
  data.ts          ← queries Prisma reutilizables
  permisos.ts      ← control de acceso por rol/empresa
  notifications.ts
  audit.ts
  validations.ts   ← schemas zod

prisma/
  schema.prisma    ← modelos de BD
  seed.ts          ← datos iniciales
  migrations/      ← historial migraciones

middleware.ts      ← protección de rutas
```

---

## Modelos Prisma — referencia rápida

```
Empresa    — nombre, dominio, color, isActive, isGlobalTarget
User       — email, passwordHash, rol (USER/ADMIN), empresaId, activo
Ticket     — numero (autoincrement), titulo, descripcion, estado, prioridad,
             categoria, empresaOrigenId, empresaDestinoId, creadorId, asignadoId
Comentario — contenido, ticketId, autorId (público)
NotaTicket — contenido, ticketId, autorId (solo admins ven esto)
Adjunto    — nombre, url, tipo, tamano, ticketId
HistorialTicket — accion, detalle (JSON), autorId, ticketId
LecturaTicket   — ultimaVisita, usuarioId, ticketId (para badge "sin leer")
Notification    — tipo, mensaje, leida, usuarioId, ticketId
Tarea           — titulo, estado (PENDIENTE/EN_CURSO/HECHO), prioridad
Propuesta       — titulo, descripcion, estado, autorNombre
TicketPresencia — quién está viendo el ticket ahora mismo
TicketEdicion   — bloqueo optimista de edición concurrente
SignupRequest   — solicitudes de registro pendientes
```

---

## Convenciones del código

- **Server Components** para páginas y queries iniciales (usan Prisma directamente)
- **Client Components** para interactividad (`"use client"` + fetch a API routes)
- **Formularios** con `react-hook-form` + `zod` + `@hookform/resolvers`
- **Notificaciones UI** con `sonner` (`toast.success`, `toast.error`)
- **Estilos** con Tailwind CSS. Componentes base de shadcn/ui en `components/ui/`
- **Auth:** `requireCurrentUser()` en API routes, `requireCurrentPageUser()` en page.tsx
- **Permisos:** siempre pasar por `lib/permisos.ts` (`puedeVerTicket`, `puedeEditarTicket`...)
- **Auditoría:** usar `logTicketAction()` de `lib/audit.ts` al cambiar estado o datos

---

## Auth y sesiones

- Cookie `incidencia_session` — token de sesión
- Cookie `incidencia_role` — rol del usuario (USER / ADMIN)
- Sin JWT externo, sin NextAuth — sistema propio con bcryptjs
- `ALLOWED_EMAIL_DOMAINS` en `.env` controla qué dominios pueden entrar
- `INITIAL_ADMIN_EMAILS` + `INITIAL_ADMIN_PASSWORD` — admins del seed

---

## Adjuntos — estado actual

- **Imágenes:** base64 guardado en `Adjunto.url` en la BD. Funciona via clipboard paste y drag&drop.
- **En Vercel (prod):** solo imágenes via JSON+base64. FormData devuelve 501.
- **PDFs y archivos:** no soportados. Decisión deliberada — no se usa servicio externo de storage.

---

## Variables de entorno necesarias

```bash
DATABASE_URL=postgresql://...
AUTH_SECRET=string_largo_aleatorio

ALLOWED_EMAIL_DOMAINS="orbe.es,entenova.com,entenova.gnosis.com,veprix.com,editorialcep.com,bn-tic.es"
INITIAL_ADMIN_EMAILS="iker.dominguez@entenova.gnosis.com"
INITIAL_ADMIN_PASSWORD="6924"

APP_HOST="127.0.0.1"
APP_PORT="3000"
APP_URL="http://127.0.0.1:3000"
NEXT_PUBLIC_APP_URL="http://127.0.0.1:3000"
NOTIFICATIONS_ENABLED=true
```

---

## Estado del proyecto

| Área | Estado |
|------|--------|
| Auth multi-empresa | ✅ Funciona |
| Kanban drag & drop | ✅ Funciona (B001 resuelto con router.refresh · B012 warning hidratación resuelto) · 4ª columna BLOQUEADO |
| Tickets CRUD | ✅ Funciona |
| Estado BLOQUEADO | ✅ Con motivo obligatorio · SLA pausado (PLAN_BLOQUEADOS.md B1-B7) |
| Nota obligatoria al resolver | ✅ En kanban y en detalle de ticket (PLAN_BLOQUEADOS.md B5) |
| Quality gate nuevo ticket | ✅ Mín 100 caracteres (B008 resuelto) |
| Comentarios | ✅ Funciona |
| Notas internas admin | ✅ Funciona |
| Notificaciones in-app | ✅ Funciona |
| Historial/auditoría | ✅ Funciona |
| Upload imágenes (clipboard) | ✅ Prod OK · compresión cliente en `lib/compress-image.ts` (B009) · imágenes servidas a demanda vía `lib/adjunto-serve.ts`, no como base64 embebido |
| Imágenes inline en el texto (estilo Jira) | ✅ Completo — comentarios, edición y creación de ticket (Tiptap, R1-R9, PLAN_EDITOR_RICO.md). Adjunto huérfano (sin ticket) hasta que el ticket se crea |
| Upload PDFs y archivos | ⚪ No implementado (decisión deliberada) |
| Vista pública sin login | ✅ `/public/tickets/[id]` y `/public/tickets/t/[numero]` |
| Estadísticas dashboard | ✅ Stat cards + alerta críticos + barra progreso por empresa |
| Exportar CSV | ✅ `/api/admin/export` (separador `;` + BOM para Excel ES) |
| SLA por prioridad | ✅ CRITICA 4h · ALTA 24h · MEDIA 72h · BAJA 120h |
| Módulo propuestas | ✅ Nav + admin + Dialog delete · pendiente M3-M5 (PLAN_PROPUESTAS.md) |

---

## Flujo de desarrollo

```
Editar código local
    ↓
npm run build  (verificar que compila)
    ↓
git add <archivos específicos>
git commit -m "tipo: descripción"
    ↓
git push origin main
    ↓
Vercel detecta push → build + deploy (~2 min)
    ↓
App en producción actualizada
```

Si cambias el schema de BD:
```bash
npx prisma migrate dev --name nombre_descriptivo
# Esto genera el SQL en prisma/migrations/ → commitear junto al código
```

---

## Cómo implementar una mejora de PLAN_MEJORAS.md

1. Leer la sección del plan — tiene el código exacto
2. Leer la sección correspondiente de SPEC_FUNCIONAL.md si necesitas contexto de negocio
3. Leer BUGS.md si el punto arregla un bug — tiene la causa raíz
4. Implementar siguiendo el código del plan
5. `npm run build` para verificar
6. Commit + push

Orden de implementación recomendado:
**P0 → P3 → P2 → P5 → P4 → P7 → P6**
