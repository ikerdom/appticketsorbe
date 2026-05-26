import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, visibleTicketWhere } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ tickets: [], users: [], empresas: [], navigation: [] });
    }
    const numeroQuery = Number(q.replace("#", ""));

    const [tickets, users, empresas] = await Promise.all([
      prisma.ticket.findMany({
      where: {
        AND: [
          visibleTicketWhere(user),
          { archivadoAt: null },
          {
            OR: [
              { titulo: { contains: q, mode: "insensitive" } },
              { descripcion: { contains: q, mode: "insensitive" } },
              { personaAfectada: { contains: q, mode: "insensitive" } },
              { contactoNombre: { contains: q, mode: "insensitive" } },
              { contactoTelefono: { contains: q, mode: "insensitive" } },
              { contactoEmail: { contains: q, mode: "insensitive" } },
              { empresaOrigen: { nombre: { contains: q, mode: "insensitive" } } },
              { destinos: { some: { empresa: { nombre: { contains: q, mode: "insensitive" } } } } },
              !Number.isNaN(numeroQuery) ? { numero: numeroQuery } : {}
            ]
          }
        ]
      },
      include: {
        empresaOrigen: { select: { nombre: true } },
        destinos: { include: { empresa: { select: { nombre: true, isGlobalTarget: true } } } }
      },
      take: 10,
      orderBy: { updatedAt: "desc" }
      }),
      prisma.user.findMany({
        where: {
          activo: true,
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } }
          ]
        },
        select: { id: true, email: true, nombre: true, name: true },
        take: 6,
        orderBy: { email: "asc" }
      }),
      prisma.empresa.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [{ nombre: { contains: q, mode: "insensitive" } }, { dominio: { contains: q, mode: "insensitive" } }]
        },
        select: { id: true, nombre: true },
        take: 6,
        orderBy: { nombre: "asc" }
      })
    ]);

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        numero: t.numero,
        titulo: t.titulo,
        estado: t.estado,
        empresaOrigen: t.empresaOrigen.nombre,
        empresaDestino: t.destinos
          .filter((d) => !d.empresa.isGlobalTarget)
          .map((d) => d.empresa.nombre)
          .join(", ")
      })),
      users: users.map((u) => ({ id: u.id, label: u.nombre || u.name || u.email, email: u.email })),
      empresas,
      navigation: [
        { id: "home", label: "Ir al tablero", href: "/" },
        { id: "new", label: "Crear ticket", href: "/tickets/nuevo" },
        ...(user.rol === "ADMIN"
          ? [
              { id: "admin-users", label: "Admin · Usuarios", href: "/admin/usuarios" },
              { id: "admin-companies", label: "Admin · Empresas", href: "/admin/empresas" },
              { id: "admin-dashboard", label: "Admin · Dashboard", href: "/admin/dashboard" }
            ]
          : [])
      ]
    });
  } catch {
    return NextResponse.json({ tickets: [], users: [], empresas: [], navigation: [] }, { status: 400 });
  }
}
