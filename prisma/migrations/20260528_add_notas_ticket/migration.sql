-- CreateTable: NotaTicket
-- Admin notes are shared between all admins (esAdmin = true)
-- User notes are private to the author (esAdmin = false)
CREATE TABLE IF NOT EXISTS "NotaTicket" (
    "id"        TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "ticketId"  TEXT NOT NULL,
    "autorId"   TEXT NOT NULL,
    "esAdmin"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaTicket_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "NotaTicket_ticketId_idx" ON "NotaTicket"("ticketId");
CREATE INDEX IF NOT EXISTS "NotaTicket_autorId_idx" ON "NotaTicket"("autorId");

-- Foreign keys
ALTER TABLE "NotaTicket"
    ADD CONSTRAINT "NotaTicket_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotaTicket"
    ADD CONSTRAINT "NotaTicket_autorId_fkey"
    FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
