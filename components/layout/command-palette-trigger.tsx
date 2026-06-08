"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommandPaletteTrigger() {
  return (
    <Button
      type="button"
      variant="outline"
      className="hidden h-9 gap-2 md:inline-flex"
      onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      title="Buscar tickets"
    >
      <Search className="h-4 w-4" />
      <span className="text-xs text-muted-foreground">Ctrl/Cmd + K</span>
    </Button>
  );
}
