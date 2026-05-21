"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface PropuestaFormProps {
  defaultAutorNombre: string;
  defaultAutorEmail: string;
  onCreated: (propuesta: unknown) => void;
}

export function PropuestaForm({ defaultAutorNombre, defaultAutorEmail, onCreated }: PropuestaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    autorNombre: defaultAutorNombre,
    autorEmail: defaultAutorEmail,
    autorTelefono: ""
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descripcion.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/propuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "No se pudo enviar la propuesta");
        return;
      }
      const { propuesta } = await res.json();
      onCreated(propuesta);
      setForm(p => ({ ...p, titulo: "", descripcion: "" }));
      toast.success("Propuesta enviada correctamente");
    });
  }

  return (
    <Card className="rounded-2xl border-amber-100 bg-amber-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Nueva propuesta de mejora
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Título de la propuesta *"
            value={form.titulo}
            onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
            required
            autoFocus
          />
          <Textarea
            placeholder="Describe tu propuesta con detalle *"
            value={form.descripcion}
            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            rows={4}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Tu nombre *"
              value={form.autorNombre}
              onChange={e => setForm(p => ({ ...p, autorNombre: e.target.value }))}
              required
            />
            <Input
              placeholder="Email (opcional)"
              type="email"
              value={form.autorEmail}
              onChange={e => setForm(p => ({ ...p, autorEmail: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600">
              {isPending ? "Enviando..." : "Enviar propuesta"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
