import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const legacy = await prisma.empresa.findFirst({
    where: {
      OR: [{ nombre: "Editorial CEP" }, { dominio: "editorialcep.com" }]
    }
  });

  if (!legacy) {
    console.log("No existe empresa legacy Editorial CEP. Nada que migrar.");
    return;
  }

  const target = await prisma.empresa.findFirst({
    where: {
      dominio: "orbeformacion.com"
    }
  });

  if (!target || target.id === legacy.id) {
    await prisma.empresa.update({
      where: { id: legacy.id },
      data: {
        nombre: "Orbe Formación",
        dominio: "orbeformacion.com",
        color: "#EA580C"
      }
    });
    console.log("Migración de empresa completada: Editorial CEP -> Orbe Formación");
    return;
  }

  await prisma.$transaction([
    prisma.user.updateMany({ where: { empresaId: legacy.id }, data: { empresaId: target.id } }),
    prisma.ticket.updateMany({ where: { empresaOrigenId: legacy.id }, data: { empresaOrigenId: target.id } }),
    prisma.ticket.updateMany({ where: { empresaDestinoId: legacy.id }, data: { empresaDestinoId: target.id } }),
    prisma.empresa.update({
      where: { id: target.id },
      data: { nombre: "Orbe Formación", color: "#EA580C", dominio: "orbeformacion.com" }
    }),
    prisma.empresa.delete({ where: { id: legacy.id } })
  ]);

  console.log("Se fusionó Editorial CEP en Orbe Formación, conservando referencias de tickets y usuarios.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
