import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  APP_ROLE_COOKIE,
  APP_SESSION_COOKIE,
  clearSessionToken
} from "@/lib/auth-session";

export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(APP_SESSION_COOKIE)?.value;
    if (token) {
      await clearSessionToken(token).catch(() => undefined);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(APP_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(APP_ROLE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[logout] error", error);
    return NextResponse.json({ ok: false, message: "No se pudo cerrar sesión." }, { status: 500 });
  }
}
