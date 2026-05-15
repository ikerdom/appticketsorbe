import crypto from "crypto";
import { cookies } from "next/headers";
import { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const APP_SESSION_COOKIE = "incidencia_session";
export const APP_ROLE_COOKIE = "incidencia_role";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSessionForUser(user: { id: string; rol: Rol }) {
  const token = createSessionToken();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires
    }
  });

  return { token, expires, rol: user.rol };
}

export async function clearSessionToken(token: string) {
  await prisma.session.deleteMany({ where: { sessionToken: token } });
}

export function cookieCommonOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: expires ? undefined : SESSION_MAX_AGE_SECONDS,
    expires
  };
}

export async function getSessionDbUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: { include: { empresa: true } } }
  });

  if (!session) return null;
  if (session.expires <= new Date()) {
    await prisma.session.delete({ where: { sessionToken: token } }).catch(() => undefined);
    return null;
  }
  if (!session.user.activo) return null;

  await prisma.user.update({ where: { id: session.userId }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  return session.user;
}
