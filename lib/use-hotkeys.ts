"use client";

import { useEffect } from "react";

type HotkeyHandlers = {
  onNewTicket: () => void;
  onFocusSearch: () => void;
  onGoHistorico: () => void;
  onGoDashboard?: () => void;
};

export function useHotkeys({ onNewTicket, onFocusSearch, onGoHistorico, onGoDashboard }: HotkeyHandlers) {
  useEffect(() => {
    let pendingG = false;
    const timerRef: { current: number | null } = { current: null };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || target?.isContentEditable;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      if (event.key.toLowerCase() === "n" && !isTyping) {
        event.preventDefault();
        onNewTicket();
        return;
      }

      if (event.key.toLowerCase() === "g" && !isTyping) {
        pendingG = true;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          pendingG = false;
        }, 800);
        return;
      }

      if (!pendingG) return;
      pendingG = false;

      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        onGoHistorico();
        return;
      }
      if (event.key.toLowerCase() === "d" && onGoDashboard) {
        event.preventDefault();
        onGoDashboard();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onFocusSearch, onGoDashboard, onGoHistorico, onNewTicket]);
}
