import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const dominio = String(body.dominio ?? "").trim().toLowerCase();
    const color = String(body.color ?? "#64748b").trim();
    const logoUrl = String(body.logoUrl ?? "").trim();

    if (!nombre || !dominio) {
      return NextResponse.json({ error: "Nombre y dominio son obligatorios." }, { status: 400 });
    }

    const empresa = await prisma.empresa.create({
      data: {
        nombre,
        dominio,
        color,
        logoUrl: logoUrl || null,
        isActive: true,
        isLegacy: false,
        isGlobalTarget: false,
        deletedAt: null
      }
    });

    return NextResponse.json({ empresa }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la empresa." }, { status: 400 });
  }
}

