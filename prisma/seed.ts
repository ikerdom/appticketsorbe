import bcrypt from "bcryptjs";
import { PrismaClient, Rol } from "@prisma/client";
import { ADMIN_PASSWORD } from "../lib/auth/config";

const prisma = new PrismaClient();

const ACTIVE_COMPANIES = [
  { nombre: "Editorial CEP", dominio: "editorialcep.com", color: "#D946EF", descripcionCorta: "Editorial y publicaciones" },
  { nombre: "Entenova", dominio: "entenova.com", color: "#0EA5A4", descripcionCorta: "Servicios y operaciones del grupo" },
  { nombre: "ORBE", dominio: "orbe.es", color: "#EA580C", descripcionCorta: "Operaciones y soporte corporativo" },
  { nombre: "Veprix", dominio: "veprix.com", color: "#059669", descripcionCorta: "Operaciones comerciales" }
] as const;

const IKER_CANONICAL_EMAIL = "iker.dominguez@entenova.gnosis.com";
const IKER_LEGACY_EMAILS = ["iker.dominguez@entenova.com", "iker.dominguez@entenova-gnosis.com"];
const IKER_NAME = "Iker Dominguez";

const JOSE_EMAIL = "jose.perez@orbe.es";
const JOSE_NAME = "Jose Perez";

const LEGACY_DOMAINS = ["bn-tic.es", "orbeformacion.com", "entenova-gnosis.com", "global.local"];
const LEGACY_NAMES = ["BN-TIC", "Orbe Formacion", "Orbe Formación", "Entenova Gnosis", "Global"];

const OBSOLETE_ADMIN_EMAILS = ["admin1@bn-tic.es", "admin2@bn-tic.es", "admin1@orbe.es", "admin2@orbe.es"];

async function ensureActiveCompanies() {
  const byDomain = new Map<string, string>();

  for (const empresa of ACTIVE_COMPANIES) {
    const saved = await prisma.empresa.upsert({
      where: { dominio: empresa.dominio },
      update: {
        nombre: empresa.nombre,
        color: empresa.color,
        descripcionCorta: empresa.descripcionCorta,
        isActive: true,
        isLegacy: false,
        isGlobalTarget: false,
        deletedAt: null
      },
      create: {
        nombre: empresa.nombre,
        dominio: empresa.dominio,
        color: empresa.color,
        descripcionCorta: empresa.descripcionCorta,
        isActive: true,
        isLegacy: false,
        isGlobalTarget: false
      }
    });
    byDomain.set(saved.dominio, saved.id);
  }

  return byDomain;
}

async function mergeUsers(sourceId: string, targetId: string) {
  if (sourceId === targetId) return;

  const [lecturas, presencias] = await Promise.all([
    prisma.lecturaTicket.findMany({ where: { usuarioId: sourceId } }),
    prisma.ticketPresencia.findMany({ where: { usuarioId: sourceId } })
  ]);

  await prisma.$transaction([
    prisma.session.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
    prisma.account.updateMany({ where: { userId: sourceId }, data: { userId: targetId } }),
    prisma.ticket.updateMany({ where: { creadorId: sourceId }, data: { creadorId: targetId } }),
    prisma.ticket.updateMany({ where: { asignadoId: sourceId }, data: { asignadoId: targetId } }),
    prisma.comentario.updateMany({ where: { autorId: sourceId }, data: { autorId: targetId } }),
    prisma.historialTicket.updateMany({ where: { autorId: sourceId }, data: { autorId: targetId } }),
    prisma.notification.updateMany({ where: { usuarioId: sourceId }, data: { usuarioId: targetId } }),
    prisma.ticketEdicion.updateMany({ where: { usuarioId: sourceId }, data: { usuarioId: targetId } })
  ]);

  for (const lectura of lecturas) {
    await prisma.lecturaTicket.upsert({
      where: { ticketId_usuarioId: { ticketId: lectura.ticketId, usuarioId: targetId } },
      update: { ultimaVisita: lectura.ultimaVisita },
      create: { ticketId: lectura.ticketId, usuarioId: targetId, ultimaVisita: lectura.ultimaVisita }
    });
  }
  await prisma.lecturaTicket.deleteMany({ where: { usuarioId: sourceId } });

  for (const presencia of presencias) {
    await prisma.ticketPresencia.upsert({
      where: { ticketId_usuarioId: { ticketId: presencia.ticketId, usuarioId: targetId } },
      update: { lastSeenAt: presencia.lastSeenAt },
      create: { ticketId: presencia.ticketId, usuarioId: targetId, lastSeenAt: presencia.lastSeenAt }
    });
  }
  await prisma.ticketPresencia.deleteMany({ where: { usuarioId: sourceId } });

  await prisma.user.delete({ where: { id: sourceId } });
}

async function consolidateOrbe(orbeId: string) {
  const legacyCompanies = await prisma.empresa.findMany({
    where: {
      OR: [
        { dominio: { in: ["bn-tic.es", "orbeformacion.com"] } },
        { nombre: { in: ["BN-TIC", "Orbe Formacion", "Orbe Formación"] } }
      ]
    },
    select: { id: true }
  });

  const legacyIds = legacyCompanies.map((c) => c.id).filter((id) => id !== orbeId);
  if (!legacyIds.length) return;

  await prisma.$transaction([
    prisma.user.updateMany({ where: { empresaId: { in: legacyIds } }, data: { empresaId: orbeId } }),
    prisma.ticket.updateMany({ where: { empresaOrigenId: { in: legacyIds } }, data: { empresaOrigenId: orbeId } }),
    prisma.ticket.updateMany({ where: { empresaDestinoId: { in: legacyIds } }, data: { empresaDestinoId: orbeId } }),
    prisma.ticketEmpresaDestino.updateMany({ where: { empresaId: { in: legacyIds } }, data: { empresaId: orbeId } })
  ]);

  await prisma.$executeRawUnsafe(`
    DELETE FROM "TicketEmpresaDestino"
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "ticketId", "empresaId" ORDER BY "createdAt" ASC) AS rn
        FROM "TicketEmpresaDestino"
      ) t
      WHERE t.rn > 1
    );
  `);
}

async function archiveLegacyCompanies() {
  await prisma.empresa.updateMany({
    where: {
      OR: [{ dominio: { in: LEGACY_DOMAINS } }, { nombre: { in: LEGACY_NAMES } }],
      NOT: { dominio: { in: ACTIVE_COMPANIES.map((c) => c.dominio) } }
    },
    data: {
      isActive: false,
      isLegacy: true,
      isGlobalTarget: false,
      deletedAt: new Date()
    }
  });
}

async function ensureCanonicalIker(entenovaId: string) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  let canonical = await prisma.user.findUnique({ where: { email: IKER_CANONICAL_EMAIL } });

  if (!canonical) {
    const legacy = await prisma.user.findFirst({
      where: { email: { in: IKER_LEGACY_EMAILS } },
      orderBy: { createdAt: "asc" }
    });

    if (legacy) {
      canonical = await prisma.user.update({
        where: { id: legacy.id },
        data: {
          email: IKER_CANONICAL_EMAIL,
          nombre: IKER_NAME,
          name: IKER_NAME,
          empresaId: entenovaId,
          rol: Rol.ADMIN,
          activo: true,
          passwordHash,
          mustChangePassword: false
        }
      });
    }
  }

  if (!canonical) {
    canonical = await prisma.user.create({
      data: {
        email: IKER_CANONICAL_EMAIL,
        nombre: IKER_NAME,
        name: IKER_NAME,
        empresaId: entenovaId,
        rol: Rol.ADMIN,
        activo: true,
        passwordHash,
        mustChangePassword: false
      }
    });
  } else {
    canonical = await prisma.user.update({
      where: { id: canonical.id },
      data: {
        nombre: IKER_NAME,
        name: IKER_NAME,
        empresaId: entenovaId,
        rol: Rol.ADMIN,
        activo: true,
        passwordHash,
        mustChangePassword: false
      }
    });
  }

  const duplicates = await prisma.user.findMany({
    where: {
      email: { in: [...IKER_LEGACY_EMAILS, IKER_CANONICAL_EMAIL] },
      NOT: { id: canonical.id }
    },
    select: { id: true }
  });

  for (const duplicate of duplicates) {
    await mergeUsers(duplicate.id, canonical.id);
  }

  return canonical;
}

async function ensureJose(orbeId: string) {
  await prisma.user.upsert({
    where: { email: JOSE_EMAIL },
    update: {
      nombre: JOSE_NAME,
      name: JOSE_NAME,
      empresaId: orbeId,
      rol: Rol.USER,
      activo: true,
      passwordHash: null,
      mustChangePassword: false,
      lastSeenAt: null
    },
    create: {
      email: JOSE_EMAIL,
      nombre: JOSE_NAME,
      name: JOSE_NAME,
      empresaId: orbeId,
      rol: Rol.USER,
      activo: true,
      passwordHash: null,
      mustChangePassword: false,
      lastSeenAt: null
    }
  });
}

async function cleanupObsoleteAdmins(orbeId: string, ikerId: string) {
  const obsoleteUsers = await prisma.user.findMany({
    where: { email: { in: OBSOLETE_ADMIN_EMAILS } },
    select: { id: true, email: true }
  });

  for (const user of obsoleteUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        rol: Rol.USER,
        empresaId: orbeId,
        passwordHash: null,
        mustChangePassword: false,
        activo: false
      }
    });
  }

  await prisma.user.updateMany({
    where: {
      id: { not: ikerId },
      rol: Rol.ADMIN
    },
    data: {
      rol: Rol.USER,
      passwordHash: null,
      mustChangePassword: false
    }
  });

  await prisma.user.updateMany({
    where: { id: { not: ikerId }, rol: Rol.USER },
    data: {
      passwordHash: null,
      mustChangePassword: false
    }
  });
}

async function main() {
  const companyIds = await ensureActiveCompanies();
  const orbeId = companyIds.get("orbe.es");
  const entenovaId = companyIds.get("entenova.com");

  if (!orbeId || !entenovaId) {
    throw new Error("No se pudieron inicializar las empresas base.");
  }

  await consolidateOrbe(orbeId);
  await archiveLegacyCompanies();

  const iker = await ensureCanonicalIker(entenovaId);
  await cleanupObsoleteAdmins(orbeId, iker.id);
  await ensureJose(orbeId);

  console.log("============================================================");
  console.log("ADMIN INICIAL LISTO");
  console.log(`Email:       ${IKER_CANONICAL_EMAIL}`);
  console.log(`Contrasena:  ${ADMIN_PASSWORD}`);
  console.log("============================================================");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
