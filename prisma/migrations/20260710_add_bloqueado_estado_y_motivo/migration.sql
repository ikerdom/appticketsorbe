-- Añade el estado BLOQUEADO al enum Estado y el campo motivoBloqueo a Ticket
ALTER TYPE "Estado" ADD VALUE IF NOT EXISTS 'BLOQUEADO' BEFORE 'RESUELTO';

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "motivoBloqueo" TEXT;
