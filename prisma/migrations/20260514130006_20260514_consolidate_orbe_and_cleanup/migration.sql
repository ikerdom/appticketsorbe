-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "archivadoAt" TIMESTAMP(3),
ADD COLUMN     "contactoNotas" TEXT,
ADD COLUMN     "contactoReferencia" TEXT;
