"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleHelp, ChevronDown, Zap } from "lucide-react";
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
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-md shadow-indigo-500/30 transition group-hover:bg-indigo-400">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">Incidencia</span>
          </Link>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: empresaColor || "#475569" }}
          >
            {empresaNombre}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="[&_button]:border-slate-700 [&_button]:bg-slate-900 [&_button]:text-slate-300 [&_button:hover]:bg-slate-800 [&_button:hover]:text-white [&_button:hover]:border-slate-600">
            <CommandPaletteTrigger />
          </div>
          <div className="[&_button]:border-slate-700 [&_button]:bg-slate-900 [&_button]:text-slate-300 [&_button:hover]:bg-slate-800 [&_button:hover]:text-white [&_button:hover]:border-slate-600">
            <NotificationBell />
          </div>
          <Link href="/tareas" className="hidden rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white md:inline-flex">
            Tickets
          </Link>
          <Link href={isAdmin ? "/admin/propuestas" : "/propuestas"} className="hidden rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white md:inline-flex">
            Propuestas
          </Link>
          <Link
            href="/bienvenida"
            target="_blank"
            rel="noreferrer"
            title="Ayuda"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <CircleHelp className="h-4 w-4" />
          </Link>

          {isAdmin ? (
            <div className="relative" ref={adminRef}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                onClick={() => setOpenMenu((prev) => (prev === "admin" ? "none" : "admin"))}
              >
                Admin <ChevronDown className="h-4 w-4" />
              </button>
              {openMenu === "admin" ? (
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                  <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/admin/usuarios">
                    Usuarios
                  </Link>
                  <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/admin/empresas">
                    Empresas
                  </Link>
                  <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/admin/dashboard">
                    Dashboard
                  </Link>
                  <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/admin/propuestas">
                    Propuestas
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="relative" ref={userRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
              title={userEmail}
              onClick={() => setOpenMenu((prev) => (prev === "user" ? "none" : "user"))}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                {initial}
              </div>
              <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">{userName}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {openMenu === "user" ? (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/perfil">
                  Perfil
                </Link>
                <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white md:hidden" href="/tareas">
                  Tickets
                </Link>
                <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white md:hidden" href={isAdmin ? "/admin/propuestas" : "/propuestas"}>
                  Propuestas
                </Link>
                {isAdmin ? (
                  <Link className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" href="/historico">
                    Histórico
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={logout}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

