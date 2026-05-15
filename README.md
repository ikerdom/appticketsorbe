# Tickets de Incidencia

Sistema multiempresa de tickets de incidencias con Next.js 14, Prisma y autenticacion propia simplificada.

## Primer arranque

1. Crear cuenta gratis en https://neon.tech y copiar la connection string.
2. Copiar `.env.example` a `.env` y rellenar `DATABASE_URL` y `AUTH_SECRET`.
3. Revisar `ALLOWED_EMAIL_DOMAINS`, `INITIAL_ADMIN_EMAILS` e `INITIAL_ADMIN_PASSWORD`.
4. Ejecutar `npm install && npm run setup && npm run dev`.
5. Abrir siempre `http://127.0.0.1:3000` (host canonico).
6. Iniciar sesion de prueba con:
   - `iker.dominguez@entenova.gnosis.com / 6924` (ADMIN).
   - `jose.perez@orbe.es` (USER, acceso solo con email).

## Deploy a Vercel

1. Crear proyecto en Vercel e importar el repositorio.
2. Crear PostgreSQL en Neon (o usar una existente).
3. Configurar variables de entorno del `.env`.
4. Ejecutar migraciones en produccion: `npx prisma migrate deploy`.
5. Ejecutar seed en produccion: `npx prisma db seed`.
6. Desplegar y validar login, permisos y flujo de tickets.

## Comandos

- `npm run dev`: desarrollo (`127.0.0.1:3000`).
- `npm run build`: build de produccion.
- `npm run lint`: lint.
- `npm run setup`: Prisma generate + migrate + seed.
- `npm run db:seed`: seed manual.
