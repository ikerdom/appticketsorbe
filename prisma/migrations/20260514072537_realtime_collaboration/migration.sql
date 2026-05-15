-- CreateTable
CREATE TABLE "TicketPresencia" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPresencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEdicion" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketEdicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketPresencia_ticketId_lastSeenAt_idx" ON "TicketPresencia"("ticketId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPresencia_ticketId_usuarioId_key" ON "TicketPresencia"("ticketId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketEdicion_ticketId_key" ON "TicketEdicion"("ticketId");

-- CreateIndex
CREATE INDEX "TicketEdicion_expiresAt_idx" ON "TicketEdicion"("expiresAt");

-- CreateIndex
CREATE INDEX "TicketEdicion_usuarioId_idx" ON "TicketEdicion"("usuarioId");

-- AddForeignKey
ALTER TABLE "TicketPresencia" ADD CONSTRAINT "TicketPresencia_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPresencia" ADD CONSTRAINT "TicketPresencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEdicion" ADD CONSTRAINT "TicketEdicion_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEdicion" ADD CONSTRAINT "TicketEdicion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
