# Especificación Funcional — AppTickets

Sistema interno de gestión de incidencias para el grupo empresarial.
Versión: 2.0 · Fecha: 2026-06-18 · Estado: **referencia activa**

---

## 1. Visión general

App web interna, accesible desde cualquier dispositivo, donde cualquier empleado de las empresas del grupo puede crear incidencias (tickets) de soporte. Los administradores las gestionan desde un kanban centralizado.

**No hay email externo. No hay registro. Entras con tu correo corporativo y listo.**

### Empresas participantes

| Empresa | Dominio | Color |
|---------|---------|-------|
| Entenova | entenova.com · entenova.gnosis.com | Teal `#0EA5A4` |
| ORBE | orbe.es | Naranja `#EA580C` |
| Editorial CEP | editorialcep.com | Rosa `#D946EF` |
| Veprix | veprix.com | Verde `#059669` |
| BN-TIC | bn-tic.es | (definir color) |

### Roles

| Rol | Quién | Qué puede hacer |
|-----|-------|-----------------|
| USER | Cualquier empleado con email corporativo | Crear tickets, ver los suyos, comentar |
| ADMIN | 3 personas designadas | Todo: gestionar todos los tickets, mover estados, asignar, notas internas, admin panel |

---

## 2. Flujos de autenticación

### 2.1 Login de usuario normal

```
Usuario entra en la app
    ↓
¿Tiene sesión activa? → SÍ → redirige a /  (dashboard)
    ↓ NO
Muestra página de login: campo de email
    ↓
Usuario introduce su email
    ↓
¿Dominio del email está en ALLOWED_EMAIL_DOMAINS?
    ↓ NO → muestra error: "Este email no pertenece a ninguna empresa autorizada"
    ↓ SÍ
¿El user ya existe en BD?
    ↓ NO → se crea automáticamente con rol USER, empresa detectada por dominio
    ↓ SÍ
¿El user está activo (activo=true)?
    ↓ NO → muestra error: "Tu cuenta está desactivada. Contacta con soporte."
    ↓ SÍ
Crea sesión → cookie incidencia_session + cookie incidencia_role
    ↓
¿Es su primera vez (bienvenidaVista=false)?
    ↓ SÍ → redirige a /bienvenida (pantalla de bienvenida + intro)
    ↓ NO → redirige a / (dashboard) o a la URL que intentaba visitar (?next=)
```

### 2.2 Login de admin

```
Admin introduce email + contraseña
    ↓
¿Email tiene dominio válido? → NO → error igual que usuario normal
    ↓ SÍ
¿Contraseña correcta (bcrypt vs passwordHash)?
    ↓ NO → error: "Contraseña incorrecta"
    ↓ SÍ
¿User tiene rol ADMIN?
    ↓ SÍ → sesión con rol=ADMIN → cookie incidencia_role=ADMIN
    ↓
Redirige al dashboard de admin
```

### 2.3 ¿Qué ve cada rol al entrar?

**USER** → `/` muestra:
- Sus tickets activos agrupados por estado
- Link rápido a "Crear nuevo ticket"
- Sus tareas asignadas (si las hay)

**ADMIN** → `/` muestra:
- Panel empresas (estadísticas por empresa)
- Kanban completo con todos los tickets de todas las empresas
- Filtros por empresa, prioridad, categoría

### 2.4 Protección de rutas (middleware)

```
Cualquier ruta que no sea pública:
    ↓
¿Tiene cookie incidencia_session? → NO → redirect /login?next=<ruta>
    ↓ SÍ
¿La ruta empieza por /admin/* ?
    ↓ SÍ → ¿cookie incidencia_role === ADMIN? → NO → redirect /forbidden
    ↓
Acceso concedido
```

Rutas públicas (sin auth):
- `/login`, `/forbidden`
- `/public/*` (ver tickets sin login — funcionalidad planificada en P2)
- `/_next/*`, `/favicon.ico`, `/manifest.json`

---

## 3. Gestión de tickets

### 3.1 Creación de un ticket

**¿Quién puede crear?** Cualquier usuario autenticado (USER o ADMIN).

**Campos del formulario:**

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Título | texto | SÍ | máx 200 chars |
| Empresa(s) afectada(s) | selector múltiple | SÍ | al menos 1 |
| Descripción | textarea | SÍ | mín 10 chars; soporta pegar imágenes |
| Prioridad | radio (Baja/Media/Alta/Crítica) | SÍ | default: Media |
| Categoría | combobox libre | NO | con sugerencias |
| Nombre/recurso afectado | texto | NO | persona, impresora, URL... |
| Teléfono de contacto | tel | NO | |
| Email de contacto | email | NO | |
| URL / referencia | texto | NO | |
| Notas adicionales | textarea | NO | |
| Adjuntos | imagen (Ctrl+V, drag, picker) | NO | máx 4MB por imagen, máx 10 |

**Flujo de creación:**

```
Usuario rellena formulario y pulsa "Crear ticket"
    ↓
Validación cliente (zod) → errores inline si falla
    ↓
POST /api/tickets
    ↓
Validación servidor → si falla → 400 + mensaje de error
    ↓
Transacción Prisma:
  - Crea Ticket (estado=ABIERTO, prioridad, categoría)
  - Crea TicketEmpresaDestino por cada empresa seleccionada
  - Crea HistorialTicket (acción: TICKET_CREADO)
  - Si categoría custom → upsert en TicketCategoriaCustom
    ↓
Si había imágenes pendientes → sube cada una a /api/tickets/{id}/adjuntos
    ↓
Crea Notification para usuarios de las empresas destino
    ↓
Redirige al detalle del ticket creado (/tickets/{id})
```

**Empresa origen**: siempre la empresa del usuario que crea. No editable.

**Empresa destino**: la que el usuario elige. Los usuarios normales tienen su empresa pre-seleccionada y bloqueada (siempre hay al menos una). Los admins pueden elegir libremente.

### 3.2 Estados del ticket y transiciones

```
ABIERTO ──────────────────────────────────── →
    │                                        │
    │ (admin o asignado arrastra / botón)    │
    ↓                                        │
EN_CURSO ─────────────────────────────────── →
    │                                        │
    │ (admin o asignado arrastra / botón     │
    │  con confirmación)                     │
    ↓                                        │
RESUELTO ────── (archivar tras 7 días) → archivado
    │
    │ (admin puede reabrir)
    ↓
ABIERTO (reapertura)
```

**¿Quién puede cambiar estado?**

| Acción | USER normal | Admin | Usuario asignado |
|--------|-------------|-------|-----------------|
| ABIERTO → EN_CURSO (tomar ticket) | Solo si es de su empresa y el ticket no tiene asignado | SÍ | SÍ |
| EN_CURSO → RESUELTO | NO | SÍ | SÍ |
| RESUELTO → ABIERTO (reabrir) | NO | SÍ | NO |
| ABIERTO → RESUELTO (saltar estado) | NO | SÍ | NO |

**Confirmación al mover a RESUELTO**: siempre se pide confirmación (actualmente via `window.confirm`, planificado como Dialog en P5).

### 3.3 Prioridades y SLA visual

| Prioridad | Color badge | SLA objetivo | Alerta visual en kanban |
|-----------|-------------|--------------|-------------------------|
| BAJA | Gris | 5 días | ninguna |
| MEDIA | Amarillo | 72 horas | ámbar si supera 72h |
| ALTA | Naranja | 24 horas | rojo si supera 24h |
| CRÍTICA | Rojo | 4 horas | rojo parpadeante (planificado) |

SLA timer en tarjeta kanban:
- Verde: dentro del SLA
- Ámbar: < 72h sin resolver (todos los niveles)
- Rojo + ⚠: ≥ 72h sin resolver (actualmente hardcoded a 72h, no por prioridad)

**Mejora planificada (P3)**: SLA por prioridad (CRÍTICA a 4h, ALTA a 24h, MEDIA a 72h).

### 3.4 Detalle de un ticket

**Secciones visibles para usuario normal:**
- Header: número, título, empresa, prioridad, estado, SLA
- Descripción (colapsable si > 500 chars)
- Empresa(s) afectada(s)
- Datos de contacto (nombre, teléfono, email, referencia, notas)
- Comentarios públicos (conversación)
- Adjuntos (imágenes subidas)
- Historial de acciones (auditoría pública)
- Botones: compartir, copiar enlace

**Secciones adicionales para ADMIN:**
- Notas internas (NotaTicket — usuarios normales NO saben que existen)
- Horas dedicadas + nota de resolución
- Botón "Asignar a" (asignar ticket a un admin)
- Botón de cambio de estado avanzado
- Editar título, descripción, prioridad, categoría

**Permisos de edición en detalle:**
- Editar campos básicos: admin + creador del ticket
- Editar datos de contacto: admin + empresa destino
- Eliminar ticket: solo admin
- Eliminar comentario propio: autor o admin
- Ver/crear notas internas: solo admin

### 3.5 Adjuntos — estado actual y planificado

**Estado ACTUAL:**
- Imágenes: sí, via base64 (pegar con Ctrl+V, drag&drop, picker)
- Límite: 4MB por imagen, máx 10 por ticket
- Almacenamiento: base64 en BD (Neon) — funciona pero ineficiente
- En producción (Vercel): SOLO imágenes via JSON+base64. FormData devuelve 501.
- PDFs: NO soportado

**Estado PLANIFICADO (P1 — alta prioridad):**
- Imágenes: mantener base64 para simplicidad + añadir uploadthing para archivos > 1MB
- PDFs: sí, via uploadthing
- Otros archivos (Word, Excel, ZIP): sí, via uploadthing
- Límite: 10MB por archivo, máx 5 archivos por ticket (negociable)
- Tipos permitidos: image/*, application/pdf, .docx, .xlsx, .zip
- Almacenamiento: uploadthing CDN (URL permanente)

**Variables de entorno necesarias para uploadthing:**
```
UPLOADTHING_SECRET=sk_live_...
UPLOADTHING_APP_ID=...
```
Ya están en package.json (`uploadthing@7.4.4`). Solo falta configurar.

### 3.6 Archivado automático

```
Cron diario (08:00 via vercel.json) → POST /api/cron/maintenance
    ↓
También al cargar el dashboard de admin
    ↓
Busca tickets RESUELTO con resueltoAt hace > 7 días
    ↓
Marca archivadoAt = now()
    ↓
Estos tickets desaparecen del kanban activo
    ↓
Aparecen en /historico (tabla paginada)
```

**Histórico en kanban**: tickets RESUELTO hace > 1 día (pero < 7) aparecen en sección colapsable "Histórico" dentro del kanban.

---

## 4. Kanban (vista admin)

### 4.1 Columnas
Tres columnas fijas: **Abierto | En curso | Resuelto**

### 4.2 Drag & drop
- Arrastrar tarjeta a otra columna → cambia estado
- Si se arrastra a RESUELTO → confirmación obligatoria
- Actualización optimista inmediata + PATCH al servidor
- Rollback si el servidor devuelve error

### 4.3 Filtros
- Por empresa (select)
- Por prioridad (select)
- Por categoría (text + datalist)
- Filtros son client-side (sin llamada API)

### 4.4 Ordenación dentro de columna
- Por prioridad descendente (CRÍTICA primero)
- Luego por updatedAt descendente

### 4.5 Separación mine/others
Para usuarios normales: "mis tickets" arriba, "otros tickets" (de mi empresa) abajo con separador.
Para admins: todos los tickets mezclados.

### 4.6 Histórico colapsable
- Tickets RESUELTO > 1 día: ocultos en kanban, aparecen en sección colapsable al final
- Solo visible para admins
- Al hacer clic → lleva al detalle del ticket

### 4.7 Sincronización multi-usuario ← BUG CONOCIDO
Ver BUGS.md → B001.
Estado planificado: usar `router.refresh()` en vez de backgroundSync client-side.

---

## 5. Portal de usuario (vista USER)

El usuario normal NO ve el kanban completo. Ve su portal personalizado:

- Lista de sus tickets activos por estado (Abiertos / En curso / Resueltos)
- Badge azul si hay actividad nueva (comentario o cambio de estado)
- Botón grande "Crear nuevo ticket"
- Sus tareas asignadas (si las hay)
- Botón "Crear propuesta/sugerencia"

Navegación:
- Click en ticket → detalle completo
- Desde detalle, Escape o botón atrás → vuelve al portal

---

## 6. Notificaciones internas (in-app)

Sin email. Todo en la app.

### 6.1 Cuándo se crea una notificación

| Evento | Quién recibe |
|--------|-------------|
| Ticket creado | Usuarios de las empresas destino |
| Comentario nuevo | Creador del ticket + admin asignado |
| Estado cambiado | Creador del ticket |
| Ticket asignado | Admin asignado |

### 6.2 Cómo se ve
- Campana en el header con número de no leídas
- Click abre listado de notificaciones
- Click en notificación → va al ticket correspondiente + marca como leída
- "Marcar todas como leídas" disponible

### 6.3 Tickets sin leer (unread badge)
- Punto azul en tarjeta kanban si hay actividad nueva desde la última vez que se visitó
- Se calcula comparando `LecturaTicket.ultimaVisita` con `Ticket.updatedAt`
- Al visitar el detalle → actualiza `LecturaTicket`

---

## 7. Tareas internas

Las tareas son para el equipo de soporte (admins), no son incidencias externas.

| Campo | Tipo |
|-------|------|
| Título | texto |
| Descripción | texto |
| Estado | PENDIENTE / EN_CURSO / HECHO |
| Prioridad | igual que tickets |
| Empresa | a qué empresa pertenece |
| Asignado | usuario admin |
| Contacto | nombre + teléfono |

Visibles en `/tareas`. No tienen historial ni comentarios públicos.

---

## 8. Propuestas (buzón de sugerencias)

Cualquier usuario puede enviar una mejora o sugerencia. Los admins las gestionan.

Estados: PENDIENTE → REVISADA → ACEPTADA / DESCARTADA

Los admins pueden añadir una nota de respuesta visible para el autor.

---

## 9. Panel de administración

### 9.1 Dashboard `/admin/dashboard`
- Estadísticas globales: total tickets, por estado, por empresa
- **Planificado (P3)**: tiempo medio resolución, KPIs, gráficos por semana

### 9.2 Empresas `/admin/empresas`
- CRUD de empresas
- Activar/desactivar
- Cambiar color, logo, descripción
- Ver estadísticas por empresa

### 9.3 Usuarios `/admin/usuarios`
- Ver todos los usuarios
- Activar/desactivar
- Cambiar rol (USER ↔ ADMIN)
- Ver cuándo fue su última sesión

### 9.4 Notas internas `/admin/notas`
- Vista de todas las notas internas de todos los tickets
- Solo admins

### 9.5 Vista en tiempo real `/admin/live`
- Ver qué usuarios están actualmente viendo qué ticket (TicketPresencia)

---

## 10. Vista pública de tickets (planificada — P2)

Un ticket tiene un enlace público que cualquiera puede ver **sin login**:

```
/public/tickets/[id]
/public/tickets/t/[numero]   ← alias más fácil de compartir
```

**Visible sin login:**
- Número, título, estado, prioridad
- Empresa afectada
- Fecha creación y última actualización
- Comentarios públicos

**No visible sin login:**
- Datos de contacto
- Notas internas
- Historial detallado
- Controles de edición

El botón "Compartir" en la tarjeta kanban apunta a esta URL pública.

---

## 11. Búsqueda global

Command palette (atajo `/` o icono en header):
- Busca en título, descripción, empresa, persona afectada, teléfono, email
- Resultados en tiempo real
- Click → va al detalle del ticket

Endpoint: `GET /api/search?q=...`

---

## 12. PWA (Progressive Web App)

La app se puede instalar como app nativa en móvil y escritorio:
- `pwa-register.tsx` gestiona el service worker
- `manifest.json` define nombre, icono, colores
- En iOS: "Añadir a pantalla de inicio" desde Safari
- En Android/Chrome: botón de instalación automático

---

## 13. Seguridad y control de acceso

### Reglas de visibilidad de tickets (lib/permisos.ts)

```
¿Puede VER el ticket?
    → ADMIN: siempre SÍ
    → USER: SÍ si es creador O si su empresa es origen O destino del ticket

¿Puede EDITAR el ticket?
    → ADMIN: siempre SÍ
    → USER: SÍ si es creador O empresa origen O empresa destino afectada

¿Puede MOVER ESTADO (drag)?
    → ADMIN: siempre SÍ
    → USER: SÍ si está asignado al ticket O si puede tomar un ticket sin asignar

¿Puede ELIMINAR el ticket?
    → Solo ADMIN

¿Puede VER notas internas?
    → Solo ADMIN

¿Puede EDITAR comentario ajeno?
    → Solo ADMIN (o el autor del comentario)
```

### Rate limiting
`lib/rate-limit.ts` existe — aplicado en endpoints críticos (login, creación).

### Bloqueo de edición concurrente
Cuando un admin abre el formulario de edición de un ticket, se registra `TicketEdicion` con `expiresAt`. Si otro admin intenta editar el mismo ticket → ve advertencia de que ya está siendo editado.

---

## 14. Flujo completo típico

```
1. Empleado de Entenova → entra con su email corporativo
2. Ve su portal: "No tienes tickets activos"
3. Pulsa "Crear ticket"
4. Rellena: "El servidor de correo no responde desde esta mañana"
   - Empresa afectada: ORBE (soporte)
   - Prioridad: ALTA
   - Categoría: Técnico
   - Pega captura de pantalla del error (Ctrl+V)
5. Pulsa "Crear ticket" → ticket #0023 creado
6. Ve el detalle del ticket, estado ABIERTO

7. Admin de ORBE recibe notificación in-app
8. Admin ve el ticket #0023 en la columna ABIERTO del kanban
9. Admin lo arrastra a EN_CURSO (o pulsa "Tomar ticket")
10. Admin añade nota interna: "Parece problema de SSL, revisando"
11. Admin comenta (público): "Estamos revisando el problema, te informamos en 1h"
12. Empleado ve el comentario en el detalle → punto azul ha desaparecido

13. Admin resuelve el problema
14. Admin completa: Horas dedicadas: 2, Nota resolución: "Renovado certificado SSL"
15. Admin arrastra a RESUELTO → confirma en el Dialog
16. Empleado ve el ticket en estado RESUELTO

17. Al día siguiente: ticket pasa a sección "Histórico" en kanban
18. A los 7 días: ticket se archiva → aparece en /historico
```

---

## 15. Glosario

| Término | Definición |
|---------|------------|
| Ticket | Incidencia o solicitud de soporte |
| Admin | Usuario con rol ADMIN, puede gestionar todos los tickets |
| USER | Usuario normal, solo ve sus propios tickets |
| Empresa origen | Empresa de quien crea el ticket |
| Empresa destino | Empresa que recibe/gestiona el ticket |
| isGlobalTarget | Empresa que recibe todos los tickets de otros (ORBE actúa como soporte central) |
| Nota interna | Comentario solo visible para admins (NotaTicket) |
| SLA | Service Level Agreement — tiempo objetivo de resolución por prioridad |
| Histórico | Tickets resueltos > 1 día, colapsados al fondo del kanban |
| Archivado | Tickets resueltos > 7 días, fuera del kanban activo |
