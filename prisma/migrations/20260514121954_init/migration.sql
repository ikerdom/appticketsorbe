-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "descripcionCorta" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isGlobalTarget" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLegacy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "categoriaCustom" TEXT,
ADD COLUMN     "contactoEmail" TEXT,
ADD COLUMN     "contactoNombre" TEXT,
ADD COLUMN     "contactoTelefono" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TicketEmpresaDestino" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEmpresaDestino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCategoriaCustom" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketCategoriaCustom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketEmpresaDestino_empresaId_idx" ON "TicketEmpresaDestino"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketEmpresaDestino_ticketId_empresaId_key" ON "TicketEmpresaDestino"("ticketId", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCategoriaCustom_nombre_key" ON "TicketCategoriaCustom"("nombre");

-- AddForeignKey
ALTER TABLE "TicketEmpresaDestino" ADD CONSTRAINT "TicketEmpresaDestino_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmpresaDestino" ADD CONSTRAINT "TicketEmpresaDestino_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
