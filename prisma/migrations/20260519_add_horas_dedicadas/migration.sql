-- Add horasDedicadas field to Ticket
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "horasDedicadas" DOUBLE PRECISION;
