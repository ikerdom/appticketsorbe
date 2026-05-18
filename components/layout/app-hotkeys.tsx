"use client";

import { useRouter } from "next/navigation";
import { useHotkeys } from "@/lib/use-hotkeys";

export function AppHotkeys({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();

  useHotkeys({
    onNewTicket: () => router.push("/tickets/nuevo"),
    onFocusSearch: () => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"], input[placeholder*="buscar"]');
      input?.focus();
    },
    onGoHistorico: () => router.push("/historico"),
    onGoDashboard: isAdmin ? () => router.push("/admin/dashboard") : undefined
  });

  return null;
}
