-- CreateEnum
CREATE TYPE "TareaEstado" AS ENUM ('PENDIENTE', 'EN_CURSO', 'HECHO');

-- CreateEnum
CREATE TYPE "PropuestaEstado" AS ENUM ('PENDIENTE', 'REVISADA', 'ACEPTADA', 'DESCARTADA');

-- CreateTable Tarea
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "TareaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "empresaId" TEXT NOT NULL,
    "creadorId" TEXT NOT NULL,
    "asignadoId" TEXT,
    "contactoNombre" TEXT,
    "contactoTelefono" TEXT,
    "resueltoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tarea_numero_key" ON "Tarea"("numero");
CREATE INDEX "Tarea_empresaId_idx" ON "Tarea"("empresaId");
CREATE INDEX "Tarea_estado_idx" ON "Tarea"("estado");

ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable Propuesta
CREATE TABLE "Propuesta" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "PropuestaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "autorNombre" TEXT NOT NULL,
    "autorEmail" TEXT,
    "autorTelefono" TEXT,
    "empresaId" TEXT,
    "userId" TEXT,
    "notaAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Propuesta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Propuesta_estado_idx" ON "Propuesta"("estado");
CREATE INDEX "Propuesta_userId_idx" ON "Propuesta"("userId");

ALTER TABLE "Propuesta" ADD CONSTRAINT "Propuesta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Propuesta" ADD CONSTRAINT "Propuesta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
