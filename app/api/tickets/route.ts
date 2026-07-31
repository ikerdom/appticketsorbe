import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroSchema, nuevoTicketSchema } from "@/lib/validations";
import { requireCurrentUser, visibleTicketWhere } from "@/lib/data";
import { sendTicketNotification } from "@/lib/notifications";
import { ticketUnreadMap } from "@/lib/lecturas";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { extractReferencedAdjuntoIds, stripHtml } from "@/lib/rich-content";
import { associarAdjuntosHuerfanos } from "@/lib/adjuntos-huerfanos";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = filtroSchema.parse(searchParams);

    const andFilters: Prisma.TicketWhereInput[] = [
      visibleTicketWhere(user),
      { archivadoAt: null }
    ];
    if (filters.empresaOrigenId) andFilters.push({ empresaOrigenId: filters.empresaOrigenId });
    if (filters.empresaDestinoId) {
      andFilters.push({
        OR: [
          { empresaOrigenId: filters.empresaDestinoId },
          { empresaDestinoId: filters.empresaDestinoId },
          { destinos: { some: { empresaId: filters.empresaDestinoId } } }
        ]
      });
    }
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

    if (user.rol === "ADMIN" && filters.vistaEmpresa === "mine") {
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
        asignado: { select: { id: true, email: true, nombre: true, name: true, image: true } },
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
  } catch (error) {
    console.error("[GET /api/tickets] error al listar tickets:", error);
    return NextResponse.json({ error: "No se pudieron cargar tickets" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = nuevoTicketSchema.parse(body);

    const descripcion = sanitizeRichText(data.descripcion);
    // Mismo mínimo de 100 caracteres que exige el cliente (new-ticket-form.tsx) —
    // reforzado en servidor para que nadie se lo salte llamando a la API directo.
    if (stripHtml(descripcion).length < 100) {
      return NextResponse.json(
        { error: "La descripción necesita al menos 100 caracteres de texto (sin contar imágenes)." },
        { status: 400 }
      );
    }

    // requireCurrentUser y activeCompanies no dependen entre si — en paralelo
    // en vez de en serie, para no acumular latencia de red hacia Neon.
    const [user, activeCompanies] = await Promise.all([
      requireCurrentUser(),
      prisma.empresa.findMany({
        where: { isActive: true, isGlobalTarget: false, deletedAt: null },
        select: { id: true, nombre: true }
      })
    ]);
    const allowed = new Set(activeCompanies.map((c) => c.id));
    const uniqueDestinatarios = Array.from(new Set(data.destinatarios)).filter((id) => allowed.has(id));
    if (!uniqueDestinatarios.length) {
      return NextResponse.json({ error: "No se han seleccionado destinatarios válidos." }, { status: 400 });
    }

    const primaryDestinoId = uniqueDestinatarios[0];
    const categoriaCustomTrim = data.categoriaCustom?.trim() || null;

    // Nested write: ticket + destinos + historial en una sola llamada a
    // Prisma (un solo viaje de red a Neon) en vez de 3 awaits secuenciales
    // dentro de una transaccion interactiva — eso era gran parte de la
    // latencia que provocaba el timeout intermitente al crear ticket.
    const ticket = await prisma.ticket.create({
      data: {
        titulo: data.titulo,
        descripcion,
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
        categoriaCustom: categoriaCustomTrim,
        asignadoId: null,
        estado: "ABIERTO",
        creadorId: user.id,
        destinos: {
          createMany: {
            data: uniqueDestinatarios.map((empresaId) => ({ empresaId })),
            skipDuplicates: true
          }
        },
        historial: {
          create: {
            autorId: user.id,
            accion: "TICKET_CREADO",
            detalle: {
              titulo: data.titulo,
              prioridad: data.prioridad,
              categoria: data.categoria ?? "OTROS",
              categoriaCustom: categoriaCustomTrim,
              destinatarios: uniqueDestinatarios
            }
          }
        }
      }
    });

    // Adjuntos huérfanos, notificaciones y el upsert de categoria custom no
    // bloquean entre si — en paralelo en vez de en serie.
    const adjuntoIds = Array.from(extractReferencedAdjuntoIds([descripcion]));
    const empresaNombre = activeCompanies.find((c) => c.id === primaryDestinoId)?.nombre ?? "Incidencia";

    const [, destinatariosUsers] = await Promise.all([
      associarAdjuntosHuerfanos(adjuntoIds, ticket.id, user.id),
      prisma.user.findMany({
        where: { activo: true, empresaId: { in: uniqueDestinatarios }, id: { not: user.id } },
        select: { id: true }
      }),
      categoriaCustomTrim
        ? prisma.ticketCategoriaCustom.upsert({
            where: { nombre: categoriaCustomTrim },
            update: {},
            create: { nombre: categoriaCustomTrim }
          })
        : Promise.resolve(null)
    ]);

    await sendTicketNotification({
      toUserIds: destinatariosUsers.map((u) => u.id),
      tipo: "ticket_creado",
      ticketId: ticket.id,
      ticketNumero: ticket.numero,
      titulo: ticket.titulo,
      mensaje: "Se ha creado un nuevo ticket.",
      empresaNombre
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tickets] error al crear ticket:", error);
    if (error instanceof ZodError) {
      const message = error.errors[0]?.message ?? "Revisa los datos del formulario.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "Tu sesión ha caducado. Recarga la página e inicia sesión de nuevo." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "No se pudo crear el ticket. Si el problema persiste, contacta con Iker." },
      { status: 500 }
    );
  }
}
