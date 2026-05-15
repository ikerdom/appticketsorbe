"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Building2, Search, Ticket, User2, X } from "lucide-react";

type TicketResult = {
  id: string;
  numero: number;
  titulo: string;
  estado: string;
  empresaOrigen: string;
  empresaDestino: string;
};

type UserResult = { id: string; label: string; email: string };
type CompanyResult = { id: string; nombre: string };
type NavResult = { id: string; label: string; href: string };

export function GlobalCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [empresas, setEmpresas] = useState<CompanyResult[]>([]);
  const [navigation, setNavigation] = useState<NavResult[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-command-palette", onOpen as EventListener);
    return () => window.removeEventListener("open-command-palette", onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setTickets([]);
        setUsers([]);
        setEmpresas([]);
        setNavigation([]);
        return;
      }
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setTickets(data.tickets ?? []);
      setUsers(data.users ?? []);
      setEmpresas(data.empresas ?? []);
      setNavigation(data.navigation ?? []);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20">
      <div ref={panelRef} className="w-full max-w-2xl rounded-xl border bg-white p-2 shadow-2xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground">Búsqueda global</p>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Command>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar ticket, usuario, empresa o navegación..."
              className="h-11 w-full rounded-lg border pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <Command.List className="mt-2 max-h-[420px] overflow-auto">
            {tickets.length === 0 && users.length === 0 && empresas.length === 0 && navigation.length === 0 ? (
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">Sin resultados</Command.Empty>
            ) : null}

            {navigation.length > 0 ? (
              <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Navegación</div>
            ) : null}
            {navigation.map((item) => (
              <Command.Item
                key={item.id}
                value={item.label}
                onSelect={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(item.href);
                }}
                className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-muted"
              >
                <span>{item.label}</span>
              </Command.Item>
            ))}

            {tickets.length > 0 ? <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Tickets</div> : null}
            {tickets.map((result) => (
              <Command.Item
                key={result.id}
                value={`${result.numero} ${result.titulo} ${result.empresaOrigen} ${result.empresaDestino}`}
                onSelect={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(`/tickets/${result.id}`);
                }}
                className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-muted"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 truncate font-medium">
                    <Ticket className="h-4 w-4" />#{String(result.numero).padStart(3, "0")} · {result.titulo}
                  </span>
                  <span className="text-xs text-muted-foreground">{result.empresaOrigen} → {result.empresaDestino}</span>
                </div>
              </Command.Item>
            ))}

            {users.length > 0 ? <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Usuarios</div> : null}
            {users.map((result) => (
              <Command.Item key={result.id} value={`${result.label} ${result.email}`} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-muted">
                <span className="inline-flex items-center gap-2 truncate"><User2 className="h-4 w-4" />{result.label}</span>
              </Command.Item>
            ))}

            {empresas.length > 0 ? <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Empresas</div> : null}
            {empresas.map((result) => (
              <Command.Item key={result.id} value={result.nombre} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-muted">
                <span className="inline-flex items-center gap-2 truncate"><Building2 className="h-4 w-4" />{result.nombre}</span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

