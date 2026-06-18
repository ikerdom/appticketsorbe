import { NextRequest, NextResponse } from "next/server";
import { Categoria, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/data";

function csvEscape(value: unknown) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = filtroSchema.parse(raw);

    const andFilters: Prisma.TicketWhereInput[] = [{ archivadoAt: null }];
    if (filters.empresaOrigenId) andFilters.push({ empresaOrigenId: filters.empresaOrigenId });
    if (filters.empresaDestinoId) {
      andFilters.push({
        OR: [{ empresaDestinoId: filters.empresaDestinoId }, { destinos: { some: { empresaId: filters.empresaDestinoId } } }]
      });
    }
    if (filters.prioridad) andFilters.push({ prioridad: filters.prioridad });
    if (filters.categoria) {
      const enumCategorias = new Set<Categoria>(["TECNICO", "ADMINISTRATIVO", "COMERCIAL", "RRHH", "OTROS"]);
      if (enumCategorias.has(filters.categoria as Categoria)) {
        andFilters.push({ categoria: filters.categoria as Categoria });
      } else {
        andFilters.push({ categoriaCustom: { contains: filters.categoria, mode: "insensitive" } });
      }
    }
    if (filters.asignadoId) andFilters.push({ asignadoId: filters.asignadoId });
    if (filters.q) {
      andFilters.push({
        OR: [
          { titulo: { contains: filters.q, mode: "insensitive" } },
          { descripcion: { contains: filters.q, mode: "insensitive" } },
          { personaAfectada: { contains: filters.q, mode: "insensitive" } },
          { empresaOrigen: { nombre: { contains: filters.q, mode: "insensitive" } } },
          { empresaDestino: { nombre: { contains: filters.q, mode: "insensitive" } } },
          { destinos: { some: { empresa: { nombre: { contains: filters.q, mode: "insensitive" } } } } },
          { categoriaCustom: { contains: filters.q, mode: "insensitive" } }
        ]
      });
    }

    const tickets = await prisma.ticket.findMany({
      where: andFilters.length ? { AND: andFilters } : undefined,
      include: {
        empresaOrigen: true,
        empresaDestino: true,
        destinos: { include: { empresa: true } },
        creador: { select: { email: true, nombre: true, name: true } },
        asignado: { select: { email: true, nombre: true, name: true } },
        _count: { select: { comentarios: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const SEP = ";"; // Punto y coma — Excel español lo detecta correctamente
    const BOM = "﻿"; // UTF-8 BOM para que Excel no muestre caracteres rotos

    function fmtDate(d: Date | null | undefined) {
      if (!d) return "";
      return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(d);
    }

    const colHeaders = [
      "Número", "Título", "Estado", "Prioridad", "Categoría",
      "Empresa origen", "Empresa destino",
      "Persona/recurso afectado", "Teléfono", "Email contacto", "Referencia/URL", "Notas contacto",
      "Creado por", "Asignado a",
      "Fecha creación", "Fecha resolución", "Horas dedicadas",
      "Nota resolución", "Comentarios"
    ];

    const lines = [colHeaders.map(csvEscape).join(SEP)];
    for (const t of tickets) {
      lines.push(
        [
          t.numero,
          t.titulo,
          t.estado,
          t.prioridad,
          t.categoriaCustom || t.categoria,
          t.empresaOrigen.nombre,
          Array.from(new Set(t.destinos.map((d) => d.empresa.nombre))).join(" | ") || t.empresaDestino.nombre,
          t.contactoNombre || t.personaAfectada || "",
          t.contactoTelefono || "",
          t.contactoEmail || "",
          t.contactoReferencia || "",
          t.contactoNotas || "",
          t.creador.nombre || t.creador.name || t.creador.email,
          t.asignado ? (t.asignado.nombre || t.asignado.name || t.asignado.email) : "",
          fmtDate(t.createdAt),
          fmtDate(t.resueltoAt),
          t.horasDedicadas ?? "",
          t.notaResolucion || "",
          t._count.comentarios
        ]
          .map(csvEscape)
          .join(SEP)
      );
    }

    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(BOM + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="incidencias_${today}.csv"`
      }
    });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}
