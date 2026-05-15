import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/data";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        nombre: user.nombre ?? user.name,
        email: user.email,
        rol: user.rol,
        empresa: user.empresa
      }
    });
  } catch {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }
}
