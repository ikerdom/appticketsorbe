# PLAN V2 — Kanban compacto · columna QA · conversación tipo correo · login sin contraseñas

Creado: 2026-10-14. Estado: **propuesta, nada implementado**. Se implementa por fases y solo tras el OK de Iker.

---

## 0. Estado actual (leído del código, no supuesto)

| Área | Hoy |
|------|-----|
| Tarjeta kanban | `components/kanban/sortable-ticket-card.tsx` (221 líneas). 5 bloques apilados: cabecera (nº, tiempo, SLA, prioridad) · título 2 líneas · **descripción 3 líneas** · badge empresa · pie (categoría + **email creador** + comentarios + asignado + enlace) + botón "→ En curso". `p-3.5`, mucho aire. |
| Columnas | 4: `ABIERTO · EN_CURSO · BLOQUEADO · RESUELTO` (enum `Estado` en `prisma/schema.prisma`). Grid `md:grid-cols-4`. |
| Conversación | `Comentario` = texto + autor + fecha. UI de **burbujas tipo WhatsApp**. Sin responder-a, sin "esperando a quién", sin visto. Notificaciones **solo dentro de la app** (`Notification`). **No hay infraestructura de email** (ni nodemailer, ni Resend, ni SMTP). |
| Login | Email → (comprueba) → contraseña. `autoComplete` existe, pero en el paso 2 el email es solo texto (no hay input `username` en el mismo formulario) → el gestor de contraseñas del navegador no empareja usuario+contraseña. Sesión **7 días** fija (`lib/auth-session.ts`). |

---

## 1. Fases (orden recomendado)

### FASE 1 — Tarjetas compactas (≈ medio día · riesgo bajo · sin BD)
Objetivo: ver el doble de tickets sin scroll.

1. **Cabecera en una línea**: `#0093 · hace 2d · ● Media · 3d⚠` (ya está casi así; quitar `mb-2.5`, bajar tamaños).
2. **Descripción fuera de la tarjeta** (queda en tooltip al pasar el ratón y en el detalle). Es lo que más altura come.
3. **Una sola línea de pie**: badge empresa (pequeño) + categoría + nº comentarios + avatar asignado. **Email del creador → nombre corto** ("Inmaculada R."), el email completo en tooltip.
4. Botón "→ En curso": solo icono/aparece al hover (hoy ocupa una fila entera en cada ABIERTO).
5. Padding `p-3.5 → p-2.5`, `space-y` menor.
6. **Interruptor "Compacta / Cómoda"** en la barra de filtros, guardado en `localStorage` (por si alguien prefiere la descripción).

Archivos: `sortable-ticket-card.tsx`, `kanban-board.tsx` (barra de filtros). Verificación: navegador local escritorio + móvil, antes/después de altura de tarjeta.

> Hacer esto **antes** de QA: con 5 columnas el ancho por columna baja un 20 % y las tarjetas actuales no caben bien.

---

### FASE 2 — Columna **QA** (Control de calidad) (≈ 1,5–2 días · riesgo medio · migración de BD)
Para tickets "creemos que está solucionado pero no al 100 %". Flujo: `EN_CURSO → QA → RESUELTO` (o `QA → EN_CURSO` si no pasa).

**Cambios:**
- `prisma/schema.prisma`: añadir `QA` al enum `Estado` (migración aditiva `ALTER TYPE ... ADD VALUE`).
- `lib/constants.ts` + `COLUMN_STYLES` del kanban: etiqueta "QA", tooltip "Control de calidad", color propio (violeta).
- `kanban-board.tsx`: 5 columnas (`md:grid-cols-5`), pestañas móvil, detección de colisión (`c.id === "QA"`), `grouped`, `HISTORICO_DIAS`.
- `app/api/tickets/[id]/estado/route.ts`: acción `qa` (solo admin) y reglas:
  - `EN_CURSO → QA`: sin nota obligatoria; nota opcional "qué hay que comprobar".
  - `QA → RESUELTO`: **nota de resolución obligatoria** (igual que hoy).
  - `QA → EN_CURSO`: "no pasó QA", motivo opcional.
- `ticket-detail-view.tsx`: botón "Enviar a QA", bloque "En QA — ¿está solucionado?" con **Confirmar (→ Resuelto)** / **No, sigue fallando (→ En curso)**.
- Tocan también: `lib/ticket-timing.ts` (+ tests), estadísticas/analytics, export CSV, histórico, vista pública, notificaciones.
- **El creador recibe aviso** al entrar en QA ("¿ya te funciona?") — se conecta con la Fase 3.

**⚠ Riesgo operativo (importante):** dev local y producción **comparten la misma BD Neon**, y `vercel-build` es `prisma generate && next build` (**no** ejecuta `migrate deploy`). Orden seguro: **1) aplicar migración aditiva** (no rompe el código desplegado) → **2) desplegar código**. Nunca al revés.

---

### FASE 3 — Conversación tipo correo (≈ 3–4 días en total, por tramos)
Lo que falta vs "flujo de correo": saber a quién le toca, poder responder cómodo, y enterarse sin entrar a la app.

**3a. "Esperando a…" (≈ 0,5 día, sin BD)** — chip calculado por el autor del último comentario: *"Pendiente de soporte"* / *"Esperando respuesta del usuario"*, en tarjeta y detalle + filtro **"Me toca responder"**. Requiere traer el último comentario en la query del kanban.

**3b. Hilo tipo correo (≈ 1,5 días, 1 columna nueva)**
- Mensajes como correos: cabecera (autor · empresa · fecha), cuerpo ancho, mensajes viejos plegados.
- **Responder a un mensaje** (cita) → campo nullable `Comentario.respondeAId`.
- Botón **"Responder y …"**: responde + cambia estado en un paso (mantener / en curso / QA / resuelto con nota). Hoy son dos pasos separados.

**3c. "Visto" (≈ 0,5 día, sin BD)** — ya existe `LecturaTicket`; mostrar "Visto por X hace 5 min".

**3d. Notificaciones por email de nuevas respuestas (≈ 1–1,5 días + decisión de proveedor)** — es la pieza que de verdad hace sentir "correo". **Bloqueado por decisión** (ver §3). Responder *desde* el correo (entrada de correo) queda **fuera**: caro y frágil; no recomendado todavía.

---

### FASE 4 — Login sin acordarse de contraseñas
**4a. Arreglos rápidos (≈ medio día · sin infraestructura nueva) — recomendado YA:**
- Paso 2 con **input `username` (readonly/oculto, `autoComplete="username"`) dentro del mismo `<form>`** → Chrome/Edge ofrecen guardar y **autocompletan** usuario+contraseña.
- `name`/`id` estándar (`email`, `password`), botón submit real, `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`, `inputMode="email"`.
- Normalizar al escribir/pegar: `trim`, minúsculas, quitar espacios y comillas (probable causa de "correos raros"); aviso amable si el dominio es legacy (`bn-tic.es`, `orbeformacion.com`…).
- **Sesión deslizante 30 días** (se renueva con el uso) en vez de 7 fijos + casilla "Recordar en este equipo".

**4b. Entrar sin contraseña — código de 6 dígitos o enlace por email (≈ 2 días)** — para usuarios normales; admins conservan contraseña. Reusa el envío de email de 3d. Quita "no recuerdo mi contraseña" de raíz. **Depende de §3.**

**4c. SSO con Microsoft (M365)** — la mejor experiencia (ya usáis Outlook/Teams), pero exige que IT dé acceso al tenant y 5 empresas pueden ser tenants distintos. **No recomendado** hasta confirmar con IT.

---

## 2. Orden y esfuerzo (aproximado, honesto)

| # | Fase | Esfuerzo | Riesgo | Depende de |
|---|------|----------|--------|------------|
| 1 | F1 Tarjetas compactas | ½ día | bajo | — |
| 2 | F4a Arreglos de login | ½ día | bajo | — |
| 3 | F2 Columna QA | 1,5–2 d | medio (migración) | F1 |
| 4 | F3a + F3c "Esperando a…" y "Visto" | 1 día | bajo | — |
| 5 | F3b Hilo tipo correo + "Responder y…" | 1,5 d | medio | F2 (opción QA) |
| 6 | F3d Email de respuestas | 1–1,5 d | medio | **decisión proveedor** |
| 7 | F4b Login sin contraseña | 2 d | medio-alto (seguridad) | F3d |

---

## 3. Decisiones — estado

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | QA — ¿quién confirma? | ✅ **Solo admin** puede mover a QA, confirmar como Resuelto o devolver a En curso |
| 2 | QA — ¿SLA sigue corriendo en QA? | ✅ **Se pausa en QA**. Si vuelve a EN_CURSO se reactiva (mismo criterio que BLOQUEADO) |
| 3 | Tarjeta — ¿quitamos descripción? | ✅ Sí, descripción fuera de la tarjeta + interruptor Compacta/Cómoda |
| 4 | Email saliente (SMTP/proveedor) | ⏸ **Sin SMTP por ahora.** F3 = solo mejora de UI dentro del ticket, sin envío de emails reales. F3d queda fuera de alcance hasta decidir proveedor. |
| 5 | "Correos raros" | ✅ **Identificado y documentado en §6** — es el bug de punycode en dominios con caracteres especiales (ej. `orbeformación.com` → `xn--orbeformacin-bib.com`) |

---

## 4. Reglas de trabajo para todas las fases (lecciones de los últimos días)

- Cada fase: `tsc` + `npm run test` + `build` + `lint` → probar en navegador local → desplegar → **verificar en producción con `vercel logs`** (no solo en local: el crash de `isomorphic-dompurify`/`sanitize-html` solo existía en Vercel).
- Dependencias nuevas (p. ej. librería de email): probar su arranque **en el runtime de Vercel** antes de darla por buena; preferir paquetes CommonJS puros.
- BD compartida dev/prod: migraciones **solo aditivas** y aplicadas **antes** del despliegue del código.
- Tests de regresión nuevos por fase (hoy 55; `lib/ticket-timing` y reglas de estado son los candidatos para QA).
- **No hago commit ni push sin tu OK explícito.**
- Datos de prueba: siempre con "(borrar)" en el título y limpiados al acabar.

---

## 5. Fuera de alcance (por ahora)
Responder por correo entrante · envío de emails (sin proveedor SMTP decidido) · SSO Microsoft · app móvil · adjuntos no-imagen · rediseño completo del dashboard.

---

## 6. Bug — Punycode en dominios de email

**Prioridad: ALTA · esfuerzo: ≈ 1h · riesgo: bajo · sin BD ni migración**

### Síntoma

En el detalle de un ticket, el campo de contacto muestra:
```
Email: rosa.cabello@xn--orbeformacin-bib.com
```
En vez de:
```
Email: rosa.cabello@orbeformación.com
```

`xn--orbeformacin-bib` es la representación [Punycode](https://en.wikipedia.org/wiki/Punycode) (ASCII Compatible Encoding) del dominio `orbeformación.com`. El navegador lo convierte al escribirlo o pegarlo en un campo de email.

### Causa

El campo `contactoEmail` en `ticket-detail-view.tsx` (línea 656) y `contactoReferencia` (línea 657) se muestran directamente sin decodificar. Lo mismo ocurre en cualquier sitio donde aparezca un email almacenado con dominio punycode.

### Alcance (archivos que muestran emails sin decodificar)

- `components/tickets/ticket-detail-view.tsx` — `contactoEmail` (líneas 656-667), `asignado?.email` (699)
- `components/kanban/sortable-ticket-card.tsx` — `ticket.creador.email` (154)
- `components/propuestas/propuestas-admin-list.tsx` — `autorEmail` (116)
- `components/tickets/historico-table.tsx` — emails en historial
- `components/tickets/admin-users-table.tsx` — lista de usuarios

### Fix — helper `decodeEmailForDisplay`

**Crear `lib/format.ts`** (o añadir a `lib/dates.ts` si ya existe un `lib/format.ts`):

```typescript
/**
 * Decodes punycode domains in email addresses for display.
 * "rosa@xn--orbeformacin-bib.com" → "rosa@orbeformación.com"
 * Works in Node 18+ and all modern browsers via URL API.
 */
export function decodeEmailForDisplay(email: string | null | undefined): string {
  if (!email) return "";
  const atIdx = email.lastIndexOf("@");
  if (atIdx === -1) return email;
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  try {
    const decoded = new URL("https://" + domain).hostname;
    return `${local}@${decoded}`;
  } catch {
    return email;
  }
}

/**
 * Decodes a punycode domain or URL for display.
 * "https://xn--orbeformacin-bib.com/path" → "https://orbeformación.com/path"
 */
export function decodeUrlForDisplay(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
    return url.replace(parsed.host, parsed.hostname); // hostname is already decoded
  } catch {
    return url;
  }
}
```

### Aplicar en los componentes

En cada lugar donde se renderice un email, reemplazar `email` por `decodeEmailForDisplay(email)`:

```tsx
// ticket-detail-view.tsx línea 656
<p><strong>Email:</strong> {decodeEmailForDisplay(ticket.contactoEmail) || "-"}</p>
// línea 667
<a href={`mailto:${ticket.contactoEmail}`}>
  {decodeEmailForDisplay(ticket.contactoEmail)}
</a>

// sortable-ticket-card.tsx
<span className="text-indigo-400">{decodeEmailForDisplay(ticket.creador.email)}</span>
```

### Normalización al guardar (opcional pero mejor)

Para no depender del helper en cada render, normalizar al escribir en el input:

```typescript
// En el onChange del Input de email en ticket-detail-view.tsx:
onChange={(e) => {
  const raw = e.target.value.trim().toLowerCase();
  const display = decodeEmailForDisplay(raw); // convierte xn-- → unicode en tiempo real
  setContactForm(prev => ({ ...prev, contactoEmail: display }));
}}
```

Así se guarda ya en unicode en BD y el bug desaparece de raíz, sin necesidad del helper en display.

---

## 7. Mejoras de documentación

El plan a continuación de mejorar la documentación del proyecto:

### 7a. SPEC_FUNCIONAL.md — secciones a añadir/actualizar

- **§ Flujo de estados completo** — tabla con todos los estados (`ABIERTO → EN_CURSO → BLOQUEADO / QA → RESUELTO`) con quién puede hacer cada transición y si requiere nota/motivo.
- **§ Empresas y dominios activos** — tabla con las 5 empresas, sus dominios, qué dominio tiene caracteres especiales (`orbeformación.com → xn--`), y cómo se normaliza.
- **§ Notificaciones** — qué eventos disparan notificación in-app y a quién.

### 7b. CLAUDE.md — añadir

- Mencionar que `contactoEmail` puede venir en punycode; usar `decodeEmailForDisplay` de `lib/format.ts`.
- Añadir `lib/format.ts` a la lista de helpers en "Estructura de carpetas".
- Actualizar tabla de estado con las fases V2 (QA, tarjetas compactas).

### 7c. README.md — añadir sección "Dominios con caracteres especiales"

```md
## Dominios con caracteres especiales

`orbeformación.com` es el dominio real pero en algunos contextos aparece como `xn--orbeformacin-bib.com`
(codificación Punycode/IDNA). El helper `decodeEmailForDisplay` de `lib/format.ts` normaliza la visualización.
Al introducir emails con este dominio, escribir siempre la versión con tilde para que se guarde correctamente.
```
