import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { requireCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const formData = await request.formData();
    const nombre = String(formData.get("nombre") ?? "").trim();
    const avatar = formData.get("avatar") as File | null;

    let image: string | undefined;
    if (avatar && avatar.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
      await mkdir(uploadDir, { recursive: true });
      const safeName = `${Date.now()}-${avatar.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const diskPath = path.join(uploadDir, safeName);
      const bytes = await avatar.arrayBuffer();
      await writeFile(diskPath, Buffer.from(bytes));
      image = `/uploads/avatars/${safeName}`;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        nombre,
        name: nombre,
        ...(image ? { image } : {})
      }
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar perfil" }, { status: 400 });
  }
}
