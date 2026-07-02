"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeEs } from "@/lib/dates";

type Notificacion = {
  id: string;
  tipo: string;
  ticketId: string | null;
  mensaje: string;
  leida: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    const response = await fetch("/api/notifications?limit=10", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setItems(data.items ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return (
    <div className="relative" ref={containerRef}>
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen((prev) => !prev)} className="relative">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[90vw] rounded-xl border bg-background shadow-xl">
          <div className="border-b px-3 py-2 text-sm font-semibold">Notificaciones</div>
          <div className="max-h-96 overflow-auto">
            {!hasItems && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Sin notificaciones</p>}
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`w-full border-b px-3 py-2 text-left transition hover:bg-muted/70 ${
                  item.leida ? "bg-slate-100/60" : "bg-amber-50/70"
                }`}
              onClick={async () => {
                  const response = await fetch(`/api/notifications/${item.id}/read`, { method: "POST" });
                  if (!response.ok) return;
                  setItems((prev) => prev.filter((n) => n.id !== item.id));
                  setUnreadCount((prev) => Math.max(0, prev - (item.leida ? 0 : 1)));
                  setOpen(false);
                  if (item.ticketId) router.push(`/tickets/${item.ticketId}`);
                  else if (item.tipo?.startsWith("PROPUESTA")) router.push("/propuestas");
                }}
              >
                <p className="line-clamp-2 text-sm">{item.mensaje}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatRelativeEs(item.createdAt)}</p>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end p-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="mr-auto">
              <X className="mr-1 h-4 w-4" />
              Cerrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const response = await fetch("/api/notifications/read-all", { method: "POST" });
                if (!response.ok) return;
                setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
                setUnreadCount(0);
                await load();
              }}
            >
              Marcar todas como leídas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
