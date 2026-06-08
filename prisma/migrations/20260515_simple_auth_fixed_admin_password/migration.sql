DO $$
DECLARE
  canonical_email TEXT := 'iker.dominguez@entenova.gnosis.com';
  canonical_id TEXT;
  candidate_id TEXT;
BEGIN
  SELECT id INTO canonical_id FROM "User" WHERE email = canonical_email LIMIT 1;

  IF canonical_id IS NULL THEN
    SELECT id INTO candidate_id
    FROM "User"
    WHERE email IN ('iker.dominguez@entenova.com', 'iker.dominguez@entenova-gnosis.com')
    ORDER BY "createdAt" ASC
    LIMIT 1;

    IF candidate_id IS NOT NULL THEN
      UPDATE "User"
      SET email = canonical_email
      WHERE id = candidate_id;

      canonical_id := candidate_id;
    END IF;
  END IF;

  IF canonical_id IS NOT NULL THEN
    FOR candidate_id IN
      SELECT id
      FROM "User"
      WHERE email IN ('iker.dominguez@entenova.com', 'iker.dominguez@entenova-gnosis.com', canonical_email)
        AND id <> canonical_id
    LOOP
      UPDATE "Session" SET "userId" = canonical_id WHERE "userId" = candidate_id;
      UPDATE "Account" SET "userId" = canonical_id WHERE "userId" = candidate_id;
      UPDATE "Ticket" SET "creadorId" = canonical_id WHERE "creadorId" = candidate_id;
      UPDATE "Ticket" SET "asignadoId" = canonical_id WHERE "asignadoId" = candidate_id;
      UPDATE "Comentario" SET "autorId" = canonical_id WHERE "autorId" = candidate_id;
      UPDATE "HistorialTicket" SET "autorId" = canonical_id WHERE "autorId" = candidate_id;
      UPDATE "Notificacion" SET "usuarioId" = canonical_id WHERE "usuarioId" = candidate_id;
      UPDATE "TicketEdicion" SET "usuarioId" = canonical_id WHERE "usuarioId" = candidate_id;

      INSERT INTO "LecturaTicket" (id, "ticketId", "usuarioId", "ultimaVisita")
      SELECT md5(random()::text || clock_timestamp()::text), lt."ticketId", canonical_id, lt."ultimaVisita"
      FROM "LecturaTicket" lt
      WHERE lt."usuarioId" = candidate_id
      ON CONFLICT ("ticketId", "usuarioId") DO UPDATE
      SET "ultimaVisita" = EXCLUDED."ultimaVisita";

      DELETE FROM "LecturaTicket" WHERE "usuarioId" = candidate_id;

      INSERT INTO "TicketPresencia" (id, "ticketId", "usuarioId", "lastSeenAt", "createdAt")
      SELECT md5(random()::text || clock_timestamp()::text), tp."ticketId", canonical_id, tp."lastSeenAt", tp."createdAt"
      FROM "TicketPresencia" tp
      WHERE tp."usuarioId" = candidate_id
      ON CONFLICT ("ticketId", "usuarioId") DO UPDATE
      SET "lastSeenAt" = EXCLUDED."lastSeenAt";

      DELETE FROM "TicketPresencia" WHERE "usuarioId" = candidate_id;

      DELETE FROM "User" WHERE id = candidate_id;
    END LOOP;
  END IF;
END $$;

UPDATE "User"
SET "mustChangePassword" = false;

UPDATE "User"
SET rol = 'USER', "passwordHash" = NULL, "mustChangePassword" = false
WHERE rol = 'ADMIN'
  AND email <> 'iker.dominguez@entenova.gnosis.com';

UPDATE "User"
SET "passwordHash" = NULL, "mustChangePassword" = false
WHERE rol = 'USER';


