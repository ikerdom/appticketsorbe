"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTimeEs } from "@/lib/dates";
import { ticketCode } from "@/lib/ticket-utils";

interface HistoricoItem {
  id: string;
  numero: number;
  titulo: string;
  prioridad: string;
  categoria: string;
  categoriaCustom: string | null;
  estado: string;
  empresaDestino: { nombre: string };
  creador: { email: string; nombre: string | null; name: string | null };
  resueltoAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function HistoricoTable({ items }: { items: HistoricoItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Título</th>
            <th className="px-3 py-2 text-left">Empresa</th>
            <th className="px-3 py-2 text-left">Prioridad</th>
            <th className="px-3 py-2 text-left">Categoría</th>
            <th className="px-3 py-2 text-left">Creador</th>
            <th className="px-3 py-2 text-left">Cerrado el</th>
            <th className="px-3 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((ticket) => (
            <tr key={ticket.id} className="border-t">
              <td className="px-3 py-2 font-mono">{ticketCode(ticket.empresaDestino.nombre, ticket.numero)}</td>
              <td className="px-3 py-2">{ticket.titulo}</td>
              <td className="px-3 py-2">{ticket.empresaDestino.nombre}</td>
              <td className="px-3 py-2">{ticket.prioridad}</td>
              <td className="px-3 py-2">{ticket.categoriaCustom || ticket.categoria}</td>
              <td className="px-3 py-2">{ticket.creador.nombre || ticket.creador.name || ticket.creador.email}</td>
              <td className="px-3 py-2">{formatDateTimeEs(ticket.resueltoAt || ticket.updatedAt)}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm("¿Reabrir este ticket y pasarlo a En curso?")) return;
                      startTransition(async () => {
                        const response = await fetch(`/api/tickets/${ticket.id}/estado`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "set_estado", estado: "EN_CURSO" })
                        });
                        if (!response.ok) {
                          toast.error("No se pudo reabrir el ticket.");
                          return;
                        }
                        toast.success("Ticket reabierto.");
                        router.refresh();
                      });
                    }}
                  >
                    Reabrir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
