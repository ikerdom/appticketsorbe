"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Lock, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { nuevoTicketSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormData = z.infer<typeof nuevoTicketSchema>;

interface NewTicketFormProps {
  empresas: { id: string; nombre: string; dominio: string; color: string | null }[];
  categoriasCustom: string[];
  currentEmpresaId: string;
  currentEmpresaNombre: string;
  currentEmpresaColor: string | null;
  isAdmin: boolean;
}

const BASE_CATEGORIAS = ["Técnico", "Administrativo", "Comercial", "RRHH", "Otros"];

const PRIORIDAD_ORDER: Array<{ value: FormData["prioridad"]; label: string; cls: string }> = [
  { value: "BAJA", label: "Baja", cls: "bg-slate-100 text-slate-700" },
  { value: "MEDIA", label: "Media", cls: "bg-yellow-100 text-yellow-800" },
  { value: "ALTA", label: "Alta", cls: "bg-orange-100 text-orange-800" },
  { value: "CRITICA", label: "Crítica", cls: "bg-red-100 text-red-800" }
];

function normalizeCategoriaToEnum(value: string): "TECNICO" | "ADMINISTRATIVO" | "COMERCIAL" | "RRHH" | "OTROS" {
  const v = value.trim().toLowerCase();
  if (v === "técnico" || v === "tecnico") return "TECNICO";
  if (v === "administrativo") return "ADMINISTRATIVO";
  if (v === "comercial") return "COMERCIAL";
  if (v === "rrhh") return "RRHH";
  return "OTROS";
}

export function NewTicketForm({ empresas, categoriasCustom, currentEmpresaId, currentEmpresaNombre, currentEmpresaColor, isAdmin }: NewTicketFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoriaInput, setCategoriaInput] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(nuevoTicketSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      destinatarios: isAdmin ? [] : [currentEmpresaId],
      personaAfectada: "",
      contactoNombre: "",
      contactoTelefono: "",
      contactoEmail: "",
      contactoReferencia: "",
      contactoNotas: "",
      prioridad: "MEDIA",
      categoria: undefined,
      categoriaCustom: "",
      asignadoId: null
    }
  });

  const selectedDestinatarios = useWatch({ control: form.control, name: "destinatarios" }) ?? [];
  const selectedPrioridad = useWatch({ control: form.control, name: "prioridad" });
  const descripcion = useWatch({ control: form.control, name: "descripcion" }) ?? "";

  const allCategorias = useMemo(() => Array.from(new Set([...BASE_CATEGORIAS, ...categoriasCustom])), [categoriasCustom]);

  function toggleEmpresa(empresaId: string) {
    if (!isAdmin && empresaId === currentEmpresaId) return; // bloqueada para usuarios normales
    const current = new Set(selectedDestinatarios);
    if (current.has(empresaId)) current.delete(empresaId);
    else current.add(empresaId);
    form.setValue("destinatarios", Array.from(current), { shouldValidate: true });
  }

  function toggleTodas() {
    const allSelected = empresas.every((e) => selectedDestinatarios.includes(e.id));
    if (allSelected) {
      // Al deseleccionar todo, mantener la empresa bloqueada si es usuario normal
      const keep = isAdmin ? [] : [currentEmpresaId];
      form.setValue("destinatarios", keep, { shouldValidate: true });
      return;
    }
    form.setValue("destinatarios", empresas.map((e) => e.id), { shouldValidate: true });
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      setError(null);

      const categoriaRaw = categoriaInput.trim();
      const categoriaEnum = categoriaRaw ? normalizeCategoriaToEnum(categoriaRaw) : "OTROS";
      const categoriaCustom = categoriaRaw && !BASE_CATEGORIAS.some((item) => item.toLowerCase() === categoriaRaw.toLowerCase()) ? categoriaRaw : undefined;

      const payload: FormData = {
        ...values,
        categoria: categoriaEnum,
        categoriaCustom
      };

      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "No se pudo crear el ticket" }));
        const message = body.error ?? "No se pudo crear el ticket";
        setError(message);
        toast.error(message);
        return;
      }

      const { ticket } = await response.json();
      toast.success("Ticket creado correctamente");
      router.push(`/tickets/${ticket.id}`);
      router.refresh();
    });
  });

  return (
    <Card className="relative rounded-2xl shadow-sm">
      <Link href="/" className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-slate-100" aria-label="Cerrar y volver al listado">
        <X className="h-4 w-4" />
      </Link>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Crear ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" {...form.register("titulo")} aria-required="true" />
            {form.formState.errors.titulo && <p className="text-sm text-red-600">{form.formState.errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Empresa(s) afectada(s)</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Empresa afectada">
              <button
                type="button"
                onClick={toggleTodas}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selectedDestinatarios.length === empresas.length ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                }`}
              >
                Todas
              </button>
              {empresas.map((empresa) => {
                const active = selectedDestinatarios.includes(empresa.id);
                const locked = !isAdmin && empresa.id === currentEmpresaId;
                return (
                  <button
                    key={empresa.id}
                    type="button"
                    onClick={() => toggleEmpresa(empresa.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${locked ? "cursor-default" : ""}`}
                    style={{
                      backgroundColor: active ? empresa.color || "#334155" : "transparent",
                      color: active ? "#fff" : undefined,
                      borderColor: empresa.color || "#cbd5e1"
                    }}
                  >
                    {locked && <Lock className="h-3 w-3 opacity-70" />}
                    {empresa.nombre}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.destinatarios && <p className="text-sm text-red-600">{form.formState.errors.destinatarios.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" rows={8} {...form.register("descripcion")} className="min-h-[160px]" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{form.formState.errors.descripcion?.message}</span>
              <span>{descripcion.length} caracteres</span>
            </div>
          </div>

          <Card className="rounded-2xl border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4" />
                Persona o recurso afectado
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Indica a quién o qué afecta el ticket: una persona, un equipo, una URL, una impresora, etc.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contactoNombre">Nombre / recurso</Label>
                <Input id="contactoNombre" {...form.register("contactoNombre")} />
                {form.formState.errors.contactoNombre && <p className="text-xs text-red-600">{form.formState.errors.contactoNombre.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactoTelefono">Teléfono de contacto</Label>
                <Input id="contactoTelefono" type="tel" {...form.register("contactoTelefono")} />
                {form.formState.errors.contactoTelefono && <p className="text-xs text-red-600">{form.formState.errors.contactoTelefono.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactoEmail">Email de contacto</Label>
                <Input id="contactoEmail" type="email" {...form.register("contactoEmail")} />
                {form.formState.errors.contactoEmail && <p className="text-xs text-red-600">{form.formState.errors.contactoEmail.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactoReferencia">URL o referencia</Label>
                <Input id="contactoReferencia" placeholder="https://... o referencia interna" {...form.register("contactoReferencia")} />
                {form.formState.errors.contactoReferencia && <p className="text-xs text-red-600">{form.formState.errors.contactoReferencia.message}</p>}
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="contactoNotas">Notas adicionales</Label>
                <Textarea id="contactoNotas" rows={3} {...form.register("contactoNotas")} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Prioridad</Label>
            <div className="inline-flex flex-wrap gap-2" role="radiogroup" aria-label="Prioridad">
              {PRIORIDAD_ORDER.map((prioridad) => (
                <button
                  key={prioridad.value}
                  type="button"
                  onClick={() => form.setValue("prioridad", prioridad.value, { shouldValidate: true })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${selectedPrioridad === prioridad.value ? prioridad.cls : "bg-white"}`}
                >
                  {prioridad.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria-input">Categoría</Label>
            <Input
              id="categoria-input"
              role="combobox"
              list="categoria-options"
              placeholder="Elige o escribe una categoría"
              value={categoriaInput}
              onChange={(event) => setCategoriaInput(event.target.value)}
            />
            <datalist id="categoria-options">
              {allCategorias.map((categoria) => (
                <option key={categoria} value={categoria} />
              ))}
            </datalist>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending} className="rounded-xl px-6">
              {isPending ? "Creando ticket..." : "Crear ticket"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

