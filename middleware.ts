import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_HOST, CANONICAL_PORT } from "@/lib/auth/config";

const APP_SESSION_COOKIE = "incidencia_session";
const APP_ROLE_COOKIE = "incidencia_role";

const PUBLIC_PATHS = ["/login", "/forbidden"];

function isStaticPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/public") ||
    // API que sirve datos/imágenes de la vista pública sin login (ticket compartido)
    pathname.startsWith("/api/public")
  );
}

function safeNext(pathname: string, search: string) {
  const value = `${pathname}${search}`;
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    const host = req.headers.get("host") ?? "";
    if (host.startsWith("localhost")) {
      const url = req.nextUrl.clone();
      url.host = CANONICAL_HOST;
      url.port = CANONICAL_PORT;
      return NextResponse.redirect(url, 308);
    }
  }

  const { pathname, search } = req.nextUrl;

  if (isStaticPath(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return NextResponse.next();

  const sessionToken = req.cookies.get(APP_SESSION_COOKIE)?.value;
  const role = req.cookies.get(APP_ROLE_COOKIE)?.value;

  if (!sessionToken) {
    const next = encodeURIComponent(safeNext(pathname, search));
    return NextResponse.redirect(new URL(`/login?next=${next}`, req.url));
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json).*)"]
};
