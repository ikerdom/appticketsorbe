import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/data";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    if (user.rol !== "ADMIN") {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
    }

    return NextResponse.json(
      { ok: false, message: "La contraseña de administradores es global y se restablece desde Admin > Usuarios." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ ok: false, message: "No se pudo procesar la solicitud." }, { status: 500 });
  }
}
