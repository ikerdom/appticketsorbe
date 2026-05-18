import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroSchema, nuevoTicketSchema } from "@/lib/validations";
import { requireCurrentUser, visibleTicketWhere } from "@/lib/data";
import { sendTicketNotification } from "@/lib/notifications";
import { ticketUnreadMap } from "@/lib/lecturas";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = filtroSchema.parse(searchParams);

    const userReadOnlyOtherCompany =
      user.rol !== "ADMIN" &&
      Boolean(filters.empresaDestinoId) &&
      filters.empresaDestinoId !== user.empresaId;

    const andFilters: Prisma.TicketWhereInput[] = [
      userReadOnlyOtherCompany ? { archivadoAt: null } : visibleTicketWhere(user),
      { archivadoAt: null }
    ];
    if (filters.empresaOrigenId) andFilters.push({ empresaOrigenId: filters.empresaOrigenId });
    if (filters.empresaDestinoId) andFilters.push({ destinos: { some: { empresaId: filters.empresaDestinoId } } });
    if (filters.prioridad) andFilters.push({ prioridad: filters.prioridad });
    if (filters.categoria) {
      andFilters.push({
        OR: [{ categoria: filters.categoria as any }, { categoriaCustom: { contains: filters.categoria, mode: "insensitive" } }]
      });
    }
    if (filters.asignadoId) andFilters.push({ asignadoId: filters.asignadoId });
    if (filters.q) {
      andFilters.push({
        OR: [
          { titulo: { contains: filters.q, mode: "insensitive" } },
          { descripcion: { contains: filters.q, mode: "insensitive" } },
          { personaAfectada: { contains: filters.q, mode: "insensitive" } },
          { contactoNombre: { contains: filters.q, mode: "insensitive" } },
          { contactoTelefono: { contains: filters.q, mode: "insensitive" } },
          { contactoEmail: { contains: filters.q, mode: "insensitive" } },
          { empresaOrigen: { nombre: { contains: filters.q, mode: "insensitive" } } },
          { destinos: { some: { empresa: { nombre: { contains: filters.q, mode: "insensitive" } } } } }
        ]
      });
    }

    if (user.rol === "ADMIN" && (filters.vistaEmpresa ?? "mine") === "mine") {
      andFilters.push({
        OR: [{ empresaOrigenId: user.empresaId }, { destinos: { some: { empresaId: user.empresaId } } }]
      });
    }

    const where: Prisma.TicketWhereInput = { AND: andFilters };

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        empresaOrigen: true,
        empresaDestino: true,
        destinos: { include: { empresa: true } },
        creador: { select: { id: true, email: true, nombre: true, name: true } },
        asignado: { select: { id: true, email: true, nombre: true, name: true } },
        _count: { select: { comentarios: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    const unread = await ticketUnreadMap(
      tickets.map((t) => t.id),
      { id: user.id, rol: user.rol }
    );

    return NextResponse.json({
      tickets: tickets.map((t) => ({ ...t, unread: unread[t.id] ?? false }))
    });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar tickets" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const data = nuevoTicketSchema.parse(body);

    const activeCompanies = await prisma.empresa.findMany({
      where: { isActive: true, isGlobalTarget: false, deletedAt: null },
      select: { id: true }
    });
    const allowed = new Set(activeCompanies.map((c) => c.id));
    const uniqueDestinatarios = Array.from(new Set(data.destinatarios)).filter((id) => allowed.has(id));
    if (!uniqueDestinatarios.length) {
      return NextResponse.json({ error: "No se han seleccionado destinatarios válidos." }, { status: 400 });
    }

    const primaryDestinoId = uniqueDestinatarios[0];

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          titulo: data.titulo,
          descripcion: data.descripcion,
          empresaOrigenId: user.empresaId,
          empresaDestinoId: primaryDestinoId,
          personaAfectada: data.personaAfectada?.trim() || null,
          contactoNombre: data.contactoNombre?.trim() || null,
          contactoTelefono: data.contactoTelefono?.trim() || null,
          contactoEmail: data.contactoEmail?.trim().toLowerCase() || null,
          contactoReferencia: data.contactoReferencia?.trim() || null,
          contactoNotas: data.contactoNotas?.trim() || null,
          prioridad: data.prioridad,
          categoria: data.categoria ?? "OTROS",
          categoriaCustom: data.categoriaCustom?.trim() || null,
          asignadoId: null,
          estado: "ABIERTO",
          creadorId: user.id
        }
      });

      await tx.ticketEmpresaDestino.createMany({
        data: uniqueDestinatarios.map((empresaId) => ({ ticketId: created.id, empresaId })),
        skipDuplicates: true
      });

      await tx.historialTicket.create({
        data: {
          ticketId: created.id,
          autorId: user.id,
          accion: "TICKET_CREADO",
          detalle: {
            titulo: created.titulo,
            prioridad: created.prioridad,
            categoria: created.categoria,
            categoriaCustom: created.categoriaCustom,
            destinatarios: uniqueDestinatarios
          }
        }
      });

      if (created.categoriaCustom?.trim()) {
        await tx.ticketCategoriaCustom.upsert({
          where: { nombre: created.categoriaCustom.trim() },
          update: {},
          create: { nombre: created.categoriaCustom.trim() }
        });
      }

      return created;
    });

    const destinatariosUsers = await prisma.user.findMany({
      where: { activo: true, empresaId: { in: uniqueDestinatarios }, id: { not: user.id } },
      select: { id: true }
    });

    await sendTicketNotification({
      toUserIds: destinatariosUsers.map((u) => u.id),
      tipo: "ticket_creado",
      ticketId: ticket.id,
      ticketNumero: ticket.numero,
      titulo: ticket.titulo,
      mensaje: "Se ha creado un nuevo ticket de incidencia."
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el ticket" }, { status: 400 });
  }
}
