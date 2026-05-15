import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

export async function GET() {
  try {
    await requireCurrentUser();

    const custom = await prisma.ticketCategoriaCustom.findMany({
      orderBy: { nombre: "asc" },
      select: { nombre: true }
    });

    return NextResponse.json({
      categorias: ["Técnico", "Administrativo", "Comercial", "RRHH", "Otros", ...custom.map((item) => item.nombre)]
    });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}

