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

const JOSE_EMAIL = "jose.perez@bn-tic.es";
const JOSE_LEGACY_EMAIL = "jose.perez@orbe.es";
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
  // Rename legacy jose.perez@orbe.es → jose.perez@bn-tic.es if exists
  const legacy = await prisma.user.findUnique({ where: { email: JOSE_LEGACY_EMAIL } });
  if (legacy) {
    const target = await prisma.user.findUnique({ where: { email: JOSE_EMAIL } });
    if (!target) {
      await prisma.user.update({ where: { id: legacy.id }, data: { email: JOSE_EMAIL } });
    } else {
      await mergeUsers(legacy.id, target.id);
    }
  }

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

async function seedDemoData(companyIds: Map<string, string>, ikerId: string) {
  const orbeId = companyIds.get("orbe.es")!;
  const entenovaId = companyIds.get("entenova.com")!;
  const veprixId = companyIds.get("veprix.com")!;
  const cepId = companyIds.get("editorialcep.com")!;

  const jose = await prisma.user.findUnique({ where: { email: JOSE_EMAIL }, select: { id: true } });
  if (!jose) return;

  // Skip if demo data already exists
  const existingDemo = await prisma.ticket.findFirst({ where: { titulo: { startsWith: "[DEMO]" } } });
  if (existingDemo) {
    console.log("Demo data already seeded, skipping.");
    return;
  }

  // Find global target empresa
  const globalTarget = await prisma.empresa.findFirst({ where: { isGlobalTarget: true } });

  // Helper to create ticket with destino
  async function createTicket(data: {
    titulo: string; descripcion: string; prioridad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
    estado: "ABIERTO" | "EN_CURSO" | "RESUELTO"; empresaOrigenId: string;
    empresaDestinoId: string; creadorId: string; asignadoId?: string;
    createdAt?: Date; resueltoAt?: Date;
  }) {
    const destEmpresa = await prisma.empresa.findUnique({ where: { id: data.empresaDestinoId } });
    if (!destEmpresa) return;
    const ticket = await prisma.ticket.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        prioridad: data.prioridad,
        estado: data.estado,
        categoria: "OTROS",
        empresaOrigenId: data.empresaOrigenId,
        empresaDestinoId: data.empresaDestinoId,
        creadorId: data.creadorId,
        asignadoId: data.asignadoId ?? null,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: data.createdAt ?? new Date(),
        resueltoAt: data.resueltoAt ?? null,
        archivadoAt: null,
        destinos: { create: { empresaId: data.empresaDestinoId } }
      }
    });
    return ticket;
  }

  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
  const oneHourAgo = new Date(Date.now() - 3600000);

  await Promise.all([
    // ABIERTA - crítica, 5 días sin resolver ⚠
    createTicket({
      titulo: "[DEMO] Caída del servidor de correo — usuarios sin acceso",
      descripcion: "Desde las 08:30 del lunes los usuarios de ORBE no pueden enviar ni recibir correos. El servidor SMTP da error 550. Afecta a todos los departamentos. Urgente.",
      prioridad: "CRITICA", estado: "ABIERTO",
      empresaOrigenId: orbeId, empresaDestinoId: entenovaId,
      creadorId: jose.id, createdAt: fiveDaysAgo
    }),
    // EN_CURSO - alta, 2 días
    createTicket({
      titulo: "[DEMO] Error en módulo de facturación — facturas duplicadas",
      descripcion: "El sistema está generando facturas duplicadas cuando el usuario reintenta el pago tras un timeout. Ya se han detectado 12 casos. El equipo está investigando.",
      prioridad: "ALTA", estado: "EN_CURSO",
      empresaOrigenId: veprixId, empresaDestinoId: entenovaId,
      creadorId: jose.id, asignadoId: ikerId, createdAt: twoDaysAgo
    }),
    // ABIERTA - media, 1h (verde)
    createTicket({
      titulo: "[DEMO] Solicitud acceso VPN para nuevo empleado",
      descripcion: "Nueva incorporación: María García, dpto. Contabilidad. Necesita acceso VPN y permisos al servidor de archivos compartidos antes del lunes.",
      prioridad: "MEDIA", estado: "ABIERTO",
      empresaOrigenId: cepId, empresaDestinoId: entenovaId,
      creadorId: jose.id, createdAt: oneHourAgo
    }),
    // RESUELTA
    createTicket({
      titulo: "[DEMO] Impresora de planta 2 no imprime en color",
      descripcion: "La impresora HP del pasillo de planta 2 imprime en B/N aunque se envíe en color. Se cambió el tóner y se reconfiguraron los drivers.",
      prioridad: "BAJA", estado: "RESUELTO",
      empresaOrigenId: orbeId, empresaDestinoId: entenovaId,
      creadorId: jose.id, createdAt: fiveDaysAgo,
      resueltoAt: twoDaysAgo
    }),
    // ABIERTA - alta desde ORBE a Veprix
    createTicket({
      titulo: "[DEMO] API de integración con ERP devuelve 403 desde ayer",
      descripcion: "La integración automática entre nuestro sistema y el ERP de Veprix lleva 24h fallando. El token de autenticación parece expirado. Necesitamos renovarlo.",
      prioridad: "ALTA", estado: "ABIERTO",
      empresaOrigenId: orbeId, empresaDestinoId: veprixId,
      creadorId: jose.id, createdAt: twoDaysAgo
    })
  ]);

  // Demo tareas/tickets internos
  await Promise.all([
    prisma.tarea.create({
      data: {
        titulo: "[DEMO] Revisar contratos de soporte Q3",
        descripcion: "Revisar todos los contratos de soporte que vencen en el tercer trimestre y enviar propuestas de renovación con 30 días de antelación.",
        prioridad: "MEDIA", estado: "PENDIENTE",
        empresaId: entenovaId, creadorId: ikerId
      }
    }),
    prisma.tarea.create({
      data: {
        titulo: "[DEMO] Migración base de datos a nueva instancia",
        descripcion: "Planificar y ejecutar la migración de la BD de producción al nuevo servidor. Backup previo obligatorio. Ventana de mantenimiento: domingo 22:00-02:00.",
        prioridad: "CRITICA", estado: "EN_CURSO",
        empresaId: entenovaId, creadorId: ikerId,
        contactoNombre: "Proveedor CloudDB", contactoTelefono: "+34 900 123 456"
      }
    }),
    prisma.tarea.create({
      data: {
        titulo: "[DEMO] Formación en nueva herramienta colaborativa",
        descripcion: "Organizar sesión de formación de 2h para los equipos de ORBE y Veprix sobre la nueva plataforma de gestión documental.",
        prioridad: "BAJA", estado: "PENDIENTE",
        empresaId: orbeId, creadorId: ikerId
      }
    })
  ]);

  // Demo propuestas
  await Promise.all([
    prisma.propuesta.create({
      data: {
        titulo: "[DEMO] Añadir notificaciones por WhatsApp",
        descripcion: "Sería muy útil recibir un WhatsApp cuando se actualiza una incidencia, ya que no siempre estamos pendientes del email. Muchos compañeros lo agradecerían.",
        autorNombre: "José Pérez", autorEmail: JOSE_EMAIL,
        estado: "PENDIENTE", empresaId: orbeId, userId: jose.id
      }
    }),
    prisma.propuesta.create({
      data: {
        titulo: "[DEMO] Vista de calendario para ver tickets por fecha",
        descripcion: "Una vista tipo calendario donde se vean los tickets abiertos por fecha de creación o resolución prevista facilitaría mucho la planificación del equipo.",
        autorNombre: "José Pérez", autorEmail: JOSE_EMAIL,
        estado: "REVISADA", empresaId: orbeId, userId: jose.id,
        notaAdmin: "Buena idea, lo valoramos para el próximo sprint. Pendiente de priorización."
      }
    })
  ]);

  console.log("✅ Demo data seeded: 5 tickets, 3 tareas, 2 propuestas");
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
  await seedDemoData(companyIds, iker.id);

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
