"use client";

import { useEffect } from "react";

export function BienvenidaMarkSeen() {
  useEffect(() => {
    void fetch("/api/bienvenida", { method: "POST" });
  }, []);

  return null;
}
