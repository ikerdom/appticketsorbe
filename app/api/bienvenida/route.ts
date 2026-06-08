import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json({ bienvenidaVista: user.bienvenidaVista });
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}

export async function POST() {
  try {
    const user = await requireCurrentUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { bienvenidaVista: true }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
}
