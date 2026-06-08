import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/data";

export async function PATCH() {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
    }

    return NextResponse.json(
      { error: "La contraseña de administradores es global y se gestiona desde Admin > Usuarios." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 400 });
  }
}
