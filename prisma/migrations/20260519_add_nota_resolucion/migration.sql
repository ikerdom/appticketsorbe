-- Add notaResolucion field to Ticket
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "notaResolucion" TEXT;
