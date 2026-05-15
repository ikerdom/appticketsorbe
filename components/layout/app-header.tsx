"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleHelp, ChevronDown, X } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPaletteTrigger } from "@/components/layout/command-palette-trigger";

interface AppHeaderProps {
  empresaNombre: string;
  empresaColor?: string | null;
  userEmail: string;
  userName: string;
  isAdmin: boolean;
}

type MenuType = "none" | "admin" | "user";

export function AppHeader({ empresaNombre, empresaColor, userEmail, userName, isAdmin }: AppHeaderProps) {
  const initial = (userName || userEmail || "U")[0]?.toUpperCase() ?? "U";
  const [openMenu, setOpenMenu] = useState<MenuType>("none");
  const adminRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (openMenu === "admin" && adminRef.current && !adminRef.current.contains(target)) setOpenMenu("none");
      if (openMenu === "user" && userRef.current && !userRef.current.contains(target)) setOpenMenu("none");
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu("none");
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  async function logout() {
    const fallback = setTimeout(() => {
      window.location.replace("/login");
    }, 700);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearTimeout(fallback);
    window.location.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-4xl font-bold tracking-tight text-slate-900">
            Incidencia
          </Link>
          <span
            className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: empresaColor || "#334155" }}
          >
            {empresaNombre}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CommandPaletteTrigger />
          <NotificationBell />
          <Link
            href="/bienvenida"
            target="_blank"
            rel="noreferrer"
            title="Ayuda"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
          >
            <CircleHelp className="h-4 w-4" />
          </Link>

          {isAdmin ? (
            <div className="relative" ref={adminRef}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm"
                onClick={() => setOpenMenu((prev) => (prev === "admin" ? "none" : "admin"))}
              >
                Admin <ChevronDown className="h-4 w-4" />
              </button>
              {openMenu === "admin" ? (
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border bg-white p-1 shadow-xl">
                  <button
                    type="button"
                    className="mb-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-slate-100"
                    onClick={() => setOpenMenu("none")}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cerrar
                  </button>
                  <Link className="block rounded-md px-3 py-2 text-sm hover:bg-muted" href="/admin/usuarios">
                    Usuarios
                  </Link>
                  <Link className="block rounded-md px-3 py-2 text-sm hover:bg-muted" href="/admin/empresas">
                    Empresas
                  </Link>
                  <Link className="block rounded-md px-3 py-2 text-sm hover:bg-muted" href="/admin/dashboard">
                    Dashboard
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="relative" ref={userRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border px-2 py-1.5"
              title={userEmail}
              onClick={() => setOpenMenu((prev) => (prev === "user" ? "none" : "user"))}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
                {initial}
              </div>
              <span className="hidden max-w-[180px] truncate text-sm font-medium md:inline">{userName}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {openMenu === "user" ? (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white p-1 shadow-xl">
                <button
                  type="button"
                  className="mb-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-slate-100"
                  onClick={() => setOpenMenu("none")}
                >
                  <X className="h-3.5 w-3.5" />
                  Cerrar
                </button>
                <Link className="block rounded-md px-3 py-2 text-sm hover:bg-muted" href="/perfil">
                  Perfil
                </Link>
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={logout}
                >
                  Cerrar sesion
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

