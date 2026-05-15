import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Rol } from "@prisma/client";
import { isAllowedEmail, isEmailFormat } from "@/lib/auth-email";
import { requireAdmin } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { ADMIN_PASSWORD } from "@/lib/auth/config";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const email = String(body.email ?? "").trim().toLowerCase();
    const nombre = String(body.nombre ?? "").trim();
    const empresaId = String(body.empresaId ?? "").trim();
    const rol: Rol = body.rol === "ADMIN" ? "ADMIN" : "USER";

    if (!email || !empresaId) {
      return NextResponse.json({ error: "Nombre, email y empresa son obligatorios." }, { status: 400 });
    }
    if (!isEmailFormat(email) || !isAllowedEmail(email)) {
      return NextResponse.json({ error: "Tu correo no pertenece a ninguna empresa autorizada." }, { status: 400 });
    }

    const empresa = await prisma.empresa.findFirst({
      where: { id: empresaId, isActive: true, isGlobalTarget: false, deletedAt: null },
      select: { id: true }
    });
    if (!empresa) {
      return NextResponse.json({ error: "La empresa seleccionada no es valida." }, { status: 400 });
    }

    const passwordHash = rol === "ADMIN" ? await bcrypt.hash(ADMIN_PASSWORD, 12) : null;

    const user = await prisma.user.create({
      data: {
        email,
        nombre: nombre || null,
        name: nombre || null,
        empresaId: empresa.id,
        rol,
        passwordHash,
        mustChangePassword: false,
        activo: true
      },
      include: { empresa: { select: { nombre: true } } }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 400 });
  }
}
