Rol: Desarrollador fullstack senior trabajando sobre la app Next.js "Incidencia — Sistema de tickets" en C:\Users\idomi\OneDrive\Documentos\EnteNova\CLOUDIA\APPTICKET. Termina lo que quedó a medias en el cambio anterior, simplifica radicalmente el login y deja la app funcionando en http://127.0.0.1:3000. Cumple npm run lint, npm run build y npm run setup sin errores. Migración Prisma única y descriptiva.
0. CONTEXTO IMPORTANTE — leer antes de tocar nada
Esta app NO es una app crítica. Es solo un panel interno para apuntar incidencias entre 4 empresas hermanas. Por eso:

Solo hay UN único administrador: Iker. Nadie más es admin.
Solo Iker usa contraseña. El resto de usuarios entran sin contraseña, solo escribiendo su email.
Esto es una decisión de producto consciente y aceptada. No añadas 2FA, no añadas magic links, no añadas verificación, no añadas captcha. Email + (password si es admin) y ya.

1. Verificar que la app arranca
Antes de cualquier cambio:

npm install (por si Codex previo dejó deps a medias).
npx prisma generate.
npm run setup.
npm run dev. Confirma que http://127.0.0.1:3000/login carga sin error 500. Si rompe, arregla primero el arranque y deja constancia de qué fallaba.

2. Usuario administrador único: Iker
Cambia el email del admin a:
iker.dominguez@entenova.gnosis.com
(ojo: dominio literal entenova.gnosis.com, con punto). Es el único admin del sistema.

Contraseña inicial: Admin1234!
mustChangePassword: false (déjalo en false; Iker la cambia después desde su perfil si quiere).
Rol: ADMIN.
Empresa asignada: Entenova (la empresa activa que ya existe en la app).

En el seed: upsert por email para que sea idempotente. Si ya existe un admin con el email antiguo iker.dominguez@entenova.com, renómbralo al nuevo email y conserva sus tickets, comentarios y sesiones. No dupliques usuarios.
Si hay otros usuarios con rol ADMIN en BBDD, bájalos a USER automáticamente en el seed (excepto el de Iker). Sin excepciones, solo Iker es ADMIN.
3. Eliminar contraseñas del resto de usuarios

Borrar passwordHash y mustChangePassword de cualquier usuario que NO sea Iker (ponlos a null y false respectivamente).
Eliminar a jose.perez@orbe.es como usuario "de prueba con contraseña". Mantenlo en seed como usuario sin contraseña (rol USER, empresa ORBE, activo). Su login será solo con email.
Cualquier otro usuario seed o real debe quedar sin contraseña salvo Iker.

4. Lógica de login simplificada
Reemplaza POST /api/auth/login por esta lógica exacta:
Input: { email, password? }

1. Normaliza email (trim + lowercase). NO apliques alias legacy de dominio salvo
   los que listo abajo (ver punto 5). El email de Iker
   iker.dominguez@entenova.gnosis.com debe llegar tal cual.
2. Busca el usuario por email exacto. Si no existe -> 401 "Usuario no autorizado".
3. Si el usuario tiene passwordHash != null (= es Iker, el admin):
     - password obligatoria.
     - bcryptjs.compare. Si falla -> 401 "Credenciales incorrectas".
     - Si OK -> crea sesión y devuelve { ok: true, role: 'ADMIN' }.
4. Si el usuario tiene passwordHash == null (= cualquier usuario normal):
     - NO se pide password. Si el cliente envía password, ignórala.
     - Crea sesión inmediatamente y devuelve { ok: true, role: 'USER' }.
5. Si el usuario está desactivado -> 423 "Usuario desactivado".
6. Rate-limit suave: 10 intentos / 60s por IP. No bloquees por email.
Errores siempre JSON, nunca 503, nunca tirar el server.
5. Alias legacy de dominio (corregir)
El alias actual entenova-gnosis.com -> entenova.com rompe el email del admin. Quítalo. Deja solo estos:
bn-tic.es        -> orbe.es
orbeformacion.com -> orbe.es
El email iker.dominguez@entenova.gnosis.com debe pasar tal cual sin normalizar ni cambiar de dominio.
6. Pantalla /login (rehacer la UX)
La pantalla debe ser un solo input de email. El password aparece solo cuando es necesario.
Flujo:

El usuario ve la card con un único campo "Email" y botón "Continuar".
Al pulsar Continuar, llama a POST /api/auth/check (endpoint nuevo) que devuelve { needsPassword: true|false } según si el usuario tiene passwordHash. No revela si el usuario existe o no: si no existe, devuelve { needsPassword: false } y luego el login normal fallará genéricamente.
Si needsPassword === false:

Hace login automáticamente con POST /api/auth/login solo con email.
Si OK → redirect a /.
Si error → muestra "No tienes acceso a esta aplicación" inline.


Si needsPassword === true:

El input email se queda fijo (read-only con botón "Cambiar email"), aparece el campo password con autoFocus, icono ojo y botón "Entrar".
Al enviar, POST /api/auth/login con email+password. Si OK → redirect a /admin/dashboard.
Si error → "Credenciales incorrectas".



Estilo: card centrada, Tailwind, modo claro, mismo layout que el resto, sin restos del flujo magic link (ni "te hemos enviado un enlace", ni "enlace de desarrollo", ni "copiar enlace"). Footer pequeño "¿Problemas para acceder? Contacta con Iker".
Quitar también la página /cambiar-password del flujo obligatorio. Déjala accesible solo en /perfil/cambiar-password para Iker (única persona que puede cambiar password).
7. Arreglar de una vez el lío 127.0.0.1 vs localhost

Define en código una constante CANONICAL_HOST = '127.0.0.1'.
Middleware: si la petición llega a localhost, responde 308 al mismo path en 127.0.0.1. Hazlo solo si NODE_ENV !== 'production'.
La cookie de sesión no debe llevar Domain= (que el navegador la asocie al host actual).
Cero URLs absolutas en el código: busca con grep http://localhost, http://127.0.0.1, y reemplaza por rutas relativas o por la constante centralizada.
.env y .env.example:
APP_HOST=127.0.0.1
APP_PORT=3000
APP_URL=http://127.0.0.1:3000

README.md: deja claro que la app se abre siempre en http://127.0.0.1:3000.

8. Limpieza de restos

Borra cualquier archivo, ruta o componente del flujo magic link que haya sobrevivido (MagicLink model, verify route, devMagicLink en UI, "Enlace de desarrollo", "Copiar enlace", "Revisa tu bandeja").
Borra restos de next-auth/next-themes/theme toggle que ya no se usan.
Asegura que el header NO muestra modo oscuro ni iconos huérfanos.

9. Repaso del resto de la app (rápido, no romper nada existente)
Mientras estás dentro, revisa visualmente:

/admin/dashboard: que cargue para Iker tras login. Si las gráficas están vacías, mostrar placeholder "Aún no hay datos en este periodo" en vez de un hueco blanco.
/admin/empresas: que muestre exactamente Editorial CEP, Entenova, ORBE, Veprix. Ni una más.
/admin/usuarios: chips de filtro solo con esas 4 empresas. Avatar con inicial. Botón "Nuevo usuario" funcional (modal: nombre, email, empresa, rol). Para el rol Admin no permitas crear más de uno: si Iker intenta crear otro admin, muestra aviso "Ya existe un administrador (Iker). Solo se permite uno".
/: kanban con tarjetas legibles, filtros con las 4 empresas reales.
/tickets/nuevo: que el formulario NO tenga "Asignar a persona concreta" ni "Adjuntos", y que "Persona o recurso afectado" tenga los campos correctos (nombre/recurso, teléfono opcional, email opcional, URL opcional, notas opcional).
Detalle de ticket con botones "Coger" → pasa a En curso y asigna al que pulsa, "Soltar", "Marcar resuelta", "Reabrir", "Volver al listado", X de cerrar arriba.
Cualquier dropdown / modal cierra con X, click fuera y Esc.

Si algo de esto está roto por los cambios previos, arréglalo.
10. Migración Prisma
Crea una sola migración nueva, descriptiva:
20260514_single_admin_password_only
Cambios incluidos:

Renombrar email del admin Iker.
passwordHash y mustChangePassword a null/false para el resto.
Garantizar consistencia: índice único en email.

11. Verificación manual a entregar
Tras todo, ejecuta:
npm run setup
npm run lint
npm run build
npm run dev
Y prueba en navegador a http://127.0.0.1:3000/login:

Meter iker.dominguez@entenova.gnosis.com → aparece campo password → meter Admin1234! → entra a /admin/dashboard como ADMIN.
Meter jose.perez@orbe.es → NO aparece password, login automático → entra a / como USER, sin menú Admin.
Meter un email inexistente, p.ej. nadie@ejemplo.com → mensaje "No tienes acceso a esta aplicación". Sin crashes.
Ir a http://localhost:3000/admin/dashboard → 308 a http://127.0.0.1:3000/admin/dashboard.
Logout desde el menú de usuario → vuelve a /login limpio.

12. Reporta al terminar

Migración aplicada (nombre exacto).
Lista final de usuarios en BBDD y cuáles tienen password (solo Iker).
Email exacto del admin (que sea iker.dominguez@entenova.gnosis.com).
Confirmación de que localhost redirige a 127.0.0.1.
Cualquier decisión propia tomada (p.ej. si tuviste que cambiar nombre de columna).