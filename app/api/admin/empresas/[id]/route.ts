import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/data";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await request.json();
    const empresa = await prisma.empresa.update({
      where: { id: params.id },
      data: {
        nombre: body.nombre,
        color: body.color,
        logoUrl: body.logoUrl ?? undefined,
        descripcionCorta: body.descripcionCorta ?? undefined
      }
    });

    return NextResponse.json({ empresa });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}

