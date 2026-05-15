📦 MACRO-RESUMEN — Proyecto "Incidencia · Sistema de Tickets"

Pega este mensaje al iniciar una conversación nueva. Contiene TODO el contexto, decisiones tomadas, estado actual y próximos pasos para que cualquier modelo o desarrollador pueda continuar sin perder hilo.


1. ¿Qué es esto?
Aplicación web interna Next.js (App Router) llamada "Incidencia — Sistema de tickets" que sirve a un pequeño grupo empresarial para apuntar y gestionar incidencias entre 4 empresas hermanas. No es una app crítica ni pública: solo se usa internamente para registrar incidencias, asignarlas y resolverlas. Funciona en local en http://127.0.0.1:3000.
Stack confirmado:

Next.js (App Router, rutas /, /tickets/nuevo, /tickets/[id], /admin/dashboard, /admin/empresas, /admin/usuarios, /login, /cambiar-password).
Prisma + base de datos local. Migraciones aplicadas vía npm run setup (idempotente con prisma migrate deploy + seed).
Tailwind CSS, modo claro únicamente (el modo oscuro y theme toggle fueron eliminados).
bcryptjs para hash de contraseñas (rounds 12).
Sesiones propias por cookie incidencia_session (httpOnly, sameSite=lax, 7 días).
Ruta del proyecto en disco: C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET.

Comandos clave:
npm install
npx prisma generate
npm run setup     # idempotente, aplica migraciones + seed
npm run lint      # debe quedar sin warnings
npm run build     # debe quedar sin errores
npm run dev       # abre en http://127.0.0.1:3000

2. Empresas (decisión final, sin negociación)
Solo existen estas 4 empresas activas en toda la app, ordenadas alfabéticamente:

Editorial CEP — dominio editorialcep.com, color sugerido #D946EF.
Entenova — dominio entenova.com, color #0EA5A4.
ORBE — dominio orbe.es, color #EA580C. Consolida y reemplaza a BN-TIC y a "Orbe Formación". Todos los usuarios y tickets de esas dos se reasignaron a ORBE.
Veprix — dominio veprix.com, color #059669.

Empresas eliminadas/archivadas, no deben aparecer en NINGÚN sitio (ni filtros, ni chips, ni dashboard, ni admin): BN-TIC, Orbe Formación, Entenova Gnosis, Global.
Alias legacy de dominio aplicados al hacer login (para que emails antiguos sigan colando):

bn-tic.es → orbe.es
orbeformacion.com → orbe.es
⚠️ El alias entenova-gnosis.com → entenova.com se ELIMINA porque rompe el email del admin (ver punto 3).


3. Usuarios y autenticación
Decisión clave de producto: esta app es ligera. Solo el administrador tiene contraseña. Todos los demás usuarios entran solo escribiendo su email, sin contraseña, sin magic link, sin verificación, sin 2FA.
Administrador único

Hay un único admin en todo el sistema: Iker.
Email exacto: iker.dominguez@entenova.gnosis.com (ojo: dominio con punto, entenova.gnosis.com).
Contraseña inicial: Admin1234!.
mustChangePassword: false (no forzar cambio al primer login).
Rol: ADMIN. Empresa: Entenova.
Si en BBDD aparece cualquier otro usuario con rol ADMIN, debe bajarse a USER. La UI debe impedir crear un segundo admin ("Ya existe un administrador (Iker). Solo se permite uno").

Usuarios normales

Rol: USER.
passwordHash = null y mustChangePassword = false para todos.
Entran únicamente con email.
Seed incluye al menos: jose.perez@orbe.es (USER, ORBE, activo, sin contraseña).

Flujo de login (/login)

La pantalla muestra solo un campo email y botón "Continuar".
Al continuar, llama a POST /api/auth/check → devuelve { needsPassword: true|false } (si el email no existe devuelve false para no filtrar usuarios).
Si needsPassword === false: hace login automático con POST /api/auth/login (solo email). Si OK → redirige a /. Si falla → mensaje genérico "No tienes acceso a esta aplicación".
Si needsPassword === true (= es Iker): aparece el campo password con autoFocus e icono ojo. Al enviar, POST /api/auth/login con email+password. Si OK → redirige a /admin/dashboard.
Errores siempre JSON, nunca 503. Rate-limit: 10 intentos / 60s por IP.

Endpoints de auth (ya implementados en backend, hay que mantener/ajustar)

POST /api/auth/check (nuevo) — comprueba si el email requiere password.
POST /api/auth/login — email + (password si admin). Crea sesión.
POST /api/auth/logout — invalida sesión, limpia cookie.
GET /api/auth/me — usuario actual.
POST /api/auth/change-password — solo accesible por Iker desde /perfil/cambiar-password.

Eliminar restos
Magic link completamente fuera: borrar modelo MagicLink, ruta /api/auth/verify, textos "te hemos enviado un enlace", "Enlace de desarrollo", "Copiar enlace", "Revisa tu bandeja", devMagicLink. Borrar también restos de next-auth y next-themes que ya no se usan.
Cookie y dominio canónico (bug ya identificado)

Host canónico: 127.0.0.1 (no localhost).
Middleware: si la petición llega a localhost, responde 308 al mismo path en 127.0.0.1 (solo si NODE_ENV !== 'production').
La cookie de sesión NO lleva Domain=. Todos los redirects internos son rutas relativas (/admin/dashboard, no http://localhost:3000/...).
.env:

  APP_HOST=127.0.0.1
  APP_PORT=3000
  APP_URL=http://127.0.0.1:3000

4. Middleware y permisos

Rutas públicas: /login, /api/auth/login, /api/auth/check, /api/auth/logout, /_next/*, /favicon.ico.
Cualquier otra ruta → requiere sesión válida; si no hay, redirige a /login?next=<ruta>.
/admin/* requiere rol ADMIN (= Iker).
Para USER: ocultar menú Admin en el header; el toggle "Todas las empresas" no aparece, solo ve tickets de su empresa + tickets dirigidos a su empresa.
Logout funcional desde el menú de usuario.


5. Modelo de datos (Prisma, conceptual)

Empresa: nombre, dominio, color, logo opcional, descripción, activo.
Usuario: nombre, email único, empresa, rol (ADMIN/USER), passwordHash?, mustChangePassword, lastSeenAt, activo.
Ticket: id corto (#ORB-0001), título, descripción, prioridad (Baja/Media/Alta/Crítica), categoría (texto, con sugeridas), estado (Abierto/En curso/Resuelto/Cerrado), empresa origen, empresas destino (N:N), asignado (User, nullable), creador, fechas.
TicketContacto (persona o recurso afectado): nombre/recurso, teléfono?, email?, url?, notas?.
Comentario / TimelineEntry: cambios de estado, asignaciones, comentarios libres.
Session: cookie + userId + expiración.
Notification: usuario, tipo, ticketId, mensaje, leída, createdAt.

Migraciones ya aplicadas (cronológicamente):

20260514121954_init
20260514131747_20260514_magic_link_login (después retirado)
20260514160000_20260514_password_auth
Próxima a aplicar: 20260514_single_admin_password_only (renombrar email de Iker, poner passwordHash=null a todos menos él, asegurar índice único en email).


6. Formulario /tickets/nuevo
Estructura final (ya implementada, mantener):

Título (obligatorio).
Destinatarios (obligatorio, multiselección de chips): un chip por cada empresa (Editorial CEP · Entenova · ORBE · Veprix) + un chip especial "Todas" que las marca/desmarca todas. Sin dropdown "empresa destino principal".
Descripción (textarea, autosize, contador de caracteres).
Persona o recurso afectado (mini-card con icono):

Nombre / recurso (texto libre, obligatorio).
Teléfono (opcional).
Email (opcional).
URL o referencia (opcional, valida si parece URL).
Notas adicionales (textarea corta, opcional).
Helper: "Indica a quién o qué afecta la incidencia: una persona, un equipo, una URL, una impresora, etc.".


Prioridad: segmented control con color (Baja · Media · Alta · Crítica).
Categoría: combobox editable con opciones predefinidas (Técnico, Administrativo, Comercial, RRHH, Otros) + escribir libre, las nuevas se persisten para autocompletado.
NO HAY "Asignar a persona concreta". Los tickets nacen siempre en Abierto y sin asignar.
NO HAY adjuntos. El input file está eliminado por completo.
Botón principal "Crear incidencia", botón "Cancelar" y X de cerrar arriba a la derecha del card.
Validación inline, toast de éxito, redirección al detalle del ticket.


7. Listado / (kanban)

Tres columnas: Abierto · En curso · Resuelto, cada una con contador y barra de color.
Tarjetas: título, ID corto, badges de empresa(s) destino con color, empresa origen, prioridad (icono+color), categoría, asignado (avatar), contacto resumido (icono tel/email), "hace X tiempo".
Filtros superiores: búsqueda libre, Empresa origen, Empresa destino, Prioridad, Categoría, Asignado.
Botón "Limpiar filtros" visible cuando hay alguno aplicado.
Toggle "Solo mi empresa" / "Todas las empresas" (la opción "Todas" solo para ADMIN).
Drag & drop entre columnas: al pasar a "En curso" sin asignado, se asigna al usuario que arrastra. Al pasar a "Resuelto" pide confirmación.
Empty state ilustrado con CTA "Crear incidencia".


8. Detalle /tickets/[id]

Cabecera: título, ID corto (#ORB-0001), estado (badge), prioridad (badge), empresas destino, empresa origen.
Columna principal: descripción, comentarios, timeline de cambios (quién y cuándo).
Columna lateral: persona/recurso afectado con botones tel: y mailto:, categoría, asignado, fechas.
Botones de acción:

Coger (solo si Abierto y sin asignar) → pasa a En curso y se asigna al usuario.
Soltar → vuelve a Abierto, sin asignar.
Reasignar (solo ADMIN).
Marcar resuelta.
Reabrir (si está Resuelta).
Cerrar (ADMIN, archiva).
Volver al listado.


X de cerrar arriba a la derecha que vuelve a /. Atajo Esc cierra y vuelve.


9. Notificaciones
Sistema funcional con modelo Notification y endpoints:

GET /api/notifications — lista del usuario actual.
POST /api/notifications/:id/read — marcar leída.
POST /api/notifications/read-all — marcar todas.

Eventos que generan notificación:

Nuevo ticket dirigido a mi empresa.
Mi ticket cambia de estado.
Me reasignan un ticket (ADMIN me lo asigna).
Comentario nuevo en un ticket donde participo.

UI: campanita en el header con badge de contador, dropdown con últimas 10 (icono, título, "hace X"), click va al ticket, botón "Marcar todas como leídas". Polling cada 30s. Cierre con click fuera, X y Esc.

10. Header

Marca "Incidencia" + chip con el nombre y color de la empresa del usuario.
Buscador Ctrl/Cmd+K (command palette real o quitarlo si no se implementa).
Campanita notificaciones.
Menú Admin (solo ADMIN): Usuarios · Empresas · Dashboard.
Menú de usuario con "Cerrar sesión" funcional.
Sin toggle modo oscuro (eliminado).
Todos los dropdowns cierran con X visible, click fuera y Esc.


11. /admin/dashboard

Filtros solo con las 4 empresas reales.
KPIs grandes (Abiertos / En curso / Resueltos) con icono, color y comparativa vs periodo anterior.
Gráficas: tickets por empresa origen, por empresa destino, distribución de prioridades (donut), evolución temporal (línea 30/90 días con selector).
Top 5 categorías como barra horizontal.
Tabla "Tickets sin asignar > 48h" con link al detalle.
Botón Exportar CSV respetando filtros, incluye campos de persona/recurso afectado y N:N de destinatarios.
Placeholder amable cuando no hay datos: "Aún no hay tickets en este periodo".


12. /admin/empresas

Muestra solo las 4 empresas activas (Editorial CEP, Entenova, ORBE, Veprix).
Columnas: Nombre, Dominio, Color, nº Usuarios, nº Tickets, acciones.
Botón "Nueva empresa" con modal: nombre, dominio, color picker, logo opcional.
Click en fila → detalle de empresa con sus usuarios, tickets y estadísticas básicas.
Editar como modal con X y Esc.


13. /admin/usuarios

Chips de filtro solo con las 4 empresas + "Todas".
Avatar con inicial y color de la empresa.
Botón "Nuevo usuario" con modal funcional: nombre, email, empresa (select de las 4), rol (Admin / Usuario). Si se intenta crear segundo admin → bloqueo con aviso "Ya existe un administrador (Iker)".
Menú de 3 puntos por fila: Editar, Cambiar empresa, Cambiar rol, Desactivar, Resetear contraseña (solo aplica a Iker).
Empty state si no hay usuarios filtrados.


14. Estilo visual

Solo modo claro. Modo oscuro eliminado por completo.
Tailwind, paleta neutra + acentos de marca por empresa.
Tipografía clara, jerarquía consistente (display para títulos, sans para cuerpo).
Componentes: rounded-2xl, sombras suaves, hover/focus accesibles, anillos de foco visibles.
Iconografía Lucide.
Microinteracciones: transiciones suaves, skeleton loaders, toasts éxito/error.
Accesibilidad AA: labels reales, roles ARIA en kanban, navegación por teclado en chips y combobox.


15. Reglas técnicas transversales

Todo dropdown, popover, modal o panel lateral debe cerrarse con: botón X visible + click fuera + tecla Esc + foco devuelto al elemento que lo abrió.
Mantener rutas existentes; no romper enlaces.
Migraciones Prisma siempre únicas, descriptivas, idempotentes.
npm run setup debe poder ejecutarse en una BBDD nueva y dejar exactamente: 4 empresas activas + Iker (ADMIN, con password) + José Pérez (USER, sin password).
Cero URLs absolutas hardcoded a http://localhost:3000. Todo relativo o vía constante CANONICAL_HOST.
npm run lint y npm run build siempre limpios antes de entregar.


16. Estado actual (a fecha de hoy)

Login por usuario+contraseña implementado, pero dos problemas conocidos:

Sigue habiendo password para José Pérez (Orbe1234!) — debe eliminarse: solo Iker tiene password.
El email de Iker está como iker.dominguez@entenova.com — debe pasar a iker.dominguez@entenova.gnosis.com.


El servidor npm run dev se quedó caído tras el último cambio de Codex (página no responde). Hay que volver a levantarlo.
El bug de localhost vs 127.0.0.1 no está aún del todo resuelto: hay redirects/enlaces que cruzan dominios y rompen la sesión.
Modo oscuro y restos de magic link / next-auth / next-themes: revisar que no quede nada.
Notificaciones, detalle de ticket con botones, drag & drop, dashboard con placeholders, modales nuevos de usuario/empresa: pendientes de validar en el navegador.


17. Próximos pasos inmediatos

Codex aplica el último prompt (single admin + password solo para Iker + email canónico nuevo + arreglo localhost↔127.0.0.1 + limpieza restos).
Verificar que npm run setup, lint, build y dev quedan en verde.
Probar manualmente en http://127.0.0.1:3000/login:

iker.dominguez@entenova.gnosis.com + Admin1234! → entra a /admin/dashboard como ADMIN.
jose.perez@orbe.es → entra a / como USER sin pedir password.
Email inexistente → mensaje genérico, sin caída.
http://localhost:3000/... → 308 a 127.0.0.1.


Hacer una pasada completa de UI (cavernícola): listado, formulario nuevo, detalle, kanban, notificaciones, admin (dashboard, empresas, usuarios).
Crear tickets reales de prueba y validar el flujo entero: crear → coger → en curso → resolver → notificar.


18. Tono y método de trabajo entre nosotros

Análisis modo cavernícola: directo, sin paños calientes, separando "BIEN 👍" y "MAL 👎".
Cada iteración produce un prompt finísimo para Codex que se pueda copiar y pegar tal cual, con secciones numeradas, criterios de aceptación y comandos de verificación.
No tomar decisiones de producto por el usuario sin avisar; cuando se tomen, listarlas en "Decisiones tomadas".
Mantener migraciones limpias, idempotencia y app navegable tras cada cambio.