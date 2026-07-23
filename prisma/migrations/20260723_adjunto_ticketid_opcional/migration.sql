-- Adjunto.ticketId pasa a opcional: durante la creación de un ticket (editor
-- rico) la imagen se sube antes de que exista el ticket, queda "huérfana"
-- hasta que el ticket se crea y se asocia.
ALTER TABLE "Adjunto" ALTER COLUMN "ticketId" DROP NOT NULL;
