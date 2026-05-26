import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/data";

const GHOST_EMAIL = "usuario.eliminado@system.local";

async function ensureGhostUser(empresaId: string) {
  return prisma.user.upsert({
    where: { email: GHOST_EMAIL },
    update: {},
    create: {
      email: GHOST_EMAIL,
      nombre: "Usuario eliminado",
      name: "Usuario eliminado",
      rol: "USER",
      empresaId,
      passwordHash: null,
      mustChangePassword: false,
      activo: false
    }
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentAdmin = await requireAdmin();
    const body = await request.json();

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, rol: true }
    });
    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (target.id === currentAdmin.id && body.activo === false) {
      return NextResponse.json({ error: "No puedes desactivarte a ti mismo." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.nombre === "string") {
      const nombre = body.nombre.trim();
      data.nombre = nombre || null;
      data.name = nombre || null;
    }

    if (typeof body.email === "string" && body.email.trim()) {
      data.email = body.email.trim().toLowerCase();
    }

    if (typeof body.empresaId === "string" && body.empresaId.trim()) {
      const empresa = await prisma.empresa.findFirst({
        where: { id: body.empresaId, isActive: true, isGlobalTarget: false, deletedAt: null },
        select: { id: true }
      });
      if (!empresa) {
        return NextResponse.json({ error: "Empresa no valida." }, { status: 400 });
      }
      data.empresaId = empresa.id;
    }

    if (typeof body.activo === "boolean") {
      data.activo = body.activo;
    }

    if (body.rol === "ADMIN" || body.rol === "USER") {
      if (target.rol === "ADMIN" && body.rol === "USER") {
        const adminCount = await prisma.user.count({ where: { rol: "ADMIN", activo: true } });
        if (adminCount <= 1) {
          return NextResponse.json({ error: "Debe haber al menos un administrador en el sistema." }, { status: 400 });
        }
      }
      data.rol = body.rol;
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentAdmin = await requireAdmin();
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, rol: true, empresaId: true, email: true }
    });

    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    if (target.email === GHOST_EMAIL) {
      return NextResponse.json({ error: "No se puede eliminar el usuario del sistema." }, { status: 400 });
    }
    if (target.id === currentAdmin.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo." }, { status: 400 });
    }
    if (target.rol === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { rol: "ADMIN", activo: true } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Debe haber al menos un administrador en el sistema." }, { status: 400 });
      }
    }

    const ghost = await ensureGhostUser(target.empresaId);

    await prisma.$transaction([
      prisma.comentario.updateMany({ where: { autorId: target.id }, data: { autorId: ghost.id } }),
      prisma.ticket.updateMany({ where: { creadorId: target.id }, data: { creadorId: ghost.id } }),
      prisma.ticket.updateMany({ where: { asignadoId: target.id }, data: { asignadoId: null } }),
      prisma.historialTicket.updateMany({ where: { autorId: target.id }, data: { autorId: null } }),
      prisma.user.delete({ where: { id: target.id } })
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}
