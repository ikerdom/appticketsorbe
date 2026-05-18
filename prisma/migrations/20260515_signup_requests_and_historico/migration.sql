-- CreateEnum
CREATE TYPE "SignupRequestEstado" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "SignupRequest" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "empresaId" TEXT,
  "estado" "SignupRequestEstado" NOT NULL DEFAULT 'PENDIENTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignupRequest_email_estado_idx" ON "SignupRequest"("email", "estado");

-- AddForeignKey
ALTER TABLE "SignupRequest" ADD CONSTRAINT "SignupRequest_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
