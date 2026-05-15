import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/data";

export async function GET() {
  try {
    await requireCurrentUser();
    const empresas = await prisma.empresa.findMany({
      where: { isActive: true, isGlobalTarget: false, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        dominio: true,
        color: true,
        logoUrl: true,
        descripcionCorta: true
      },
      orderBy: { nombre: "asc" }
    });
    return NextResponse.json({ empresas });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}
