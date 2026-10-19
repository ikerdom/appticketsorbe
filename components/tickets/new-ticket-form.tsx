"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  Info, Lock, UserRound, X, Zap
} from "lucide-react";
import { toast } from "sonner";
import { nuevoTicketSchema } from "@/lib/validations";
import { stripHtml } from "@/lib/rich-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const RichTextEditor = dynamic(() => import("@/components/ui/rich-text-editor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-xl border bg-slate-100" />
});

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

const PRIORIDAD_CONFIG: Array<{
  value: FormData["prioridad"];
  label: string;
  dot: string;
  active: string;
}> = [
  { value: "BAJA",    label: "Baja",    dot: "bg-slate-300",  active: "bg-slate-700 text-white border-slate-700" },
  { value: "MEDIA",   label: "Media",   dot: "bg-yellow-400", active: "bg-yellow-500 text-white border-yellow-500" },
  { value: "ALTA",    label: "Alta",    dot: "bg-orange-400", active: "bg-orange-500 text-white border-orange-500" },
  { value: "CRITICA", label: "Crítica", dot: "bg-red-500",    active: "bg-red-600 text-white border-red-600" }
];

function normalizeCategoriaToEnum(value: string): "TECNICO" | "ADMINISTRATIVO" | "COMERCIAL" | "RRHH" | "OTROS" {
  const v = value.trim().toLowerCase();
  if (v === "técnico" || v === "tecnico") return "TECNICO";
  if (v === "administrativo") return "ADMINISTRATIVO";
  if (v === "comercial") return "COMERCIAL";
  if (v === "rrhh") return "RRHH";
  return "OTROS";
}

export function NewTicketForm({
  empresas, categoriasCustom, currentEmpresaId, isAdmin
}: NewTicketFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [categoriaInput, setCategoriaInput] = useState("");
  const [showTips, setShowTips] = useState(false);

  const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

  async function uploadPendingImage(file: File): Promise<string | null> {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagen demasiado grande (máx 3 MB). Recorta la zona relevante.");
      return null;
    }
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        try {
          const res = await fetch("/api/adjuntos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name || `imagen-${Date.now()}.png`, tipo: file.type || "image/png", base64 })
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({ error: "Error al subir imagen" }));
            toast.error(body.error ?? "Error al subir imagen");
            resolve(null);
            return;
          }
          const { adjunto } = await res.json();
          resolve(`/api/adjuntos/${adjunto.id}`);
        } catch {
          toast.error("Error al subir imagen");
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  }

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

  const MIN_CARACTERES = 100;
  const caracteres = stripHtml(descripcion).length;
  const descripcionOk = caracteres >= MIN_CARACTERES;

  const allCategorias = useMemo(() => Array.from(new Set([...BASE_CATEGORIAS, ...categoriasCustom])), [categoriasCustom]);

  function toggleEmpresa(empresaId: string) {
    if (!isAdmin && empresaId === currentEmpresaId) return;
    const current = new Set(selectedDestinatarios);
    if (current.has(empresaId)) current.delete(empresaId);
    else current.add(empresaId);
    form.setValue("destinatarios", Array.from(current), { shouldValidate: true });
  }

  function toggleTodas() {
    const allSelected = empresas.every((e) => selectedDestinatarios.includes(e.id));
    if (allSelected) {
      form.setValue("destinatarios", isAdmin ? [] : [currentEmpresaId], { shouldValidate: true });
      return;
    }
    form.setValue("destinatarios", empresas.map((e) => e.id), { shouldValidate: true });
  }

  const FIELD_ORDER = ["titulo", "destinatarios", "contactoNombre", "contactoTelefono", "contactoEmail", "contactoReferencia"] as const;
  const FIELD_SCROLL_ID: Record<(typeof FIELD_ORDER)[number], string> = {
    titulo: "titulo",
    destinatarios: "empresa-afectada",
    contactoNombre: "contactoNombre",
    contactoTelefono: "contactoTelefono",
    contactoEmail: "contactoEmail",
    contactoReferencia: "contactoReferencia"
  };

  function onInvalid(errors: typeof form.formState.errors) {
    const firstKey = FIELD_ORDER.find((key) => errors[key]);
    const message = (firstKey && (errors[firstKey]?.message as string)) || "Revisa los campos marcados en rojo.";
    toast.error(message);
    if (firstKey) {
      document.getElementById(FIELD_SCROLL_ID[firstKey])?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    const chars = stripHtml(values.descripcion).length;
    if (chars < MIN_CARACTERES) {
      setDescError(
        `Necesitamos más detalle (${chars}/${MIN_CARACTERES} caracteres). ` +
        "Explica qué falla, cómo debería funcionar y qué ves exactamente. " +
        "Adjunta una captura con Ctrl+V."
      );
      document.getElementById("descripcion")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.querySelector<HTMLElement>('#descripcion [contenteditable="true"]')?.focus();
      return;
    }
    setDescError(null);

    startTransition(async () => {
      setError(null);
      const categoriaRaw = categoriaInput.trim();
      const categoriaEnum = categoriaRaw ? normalizeCategoriaToEnum(categoriaRaw) : "OTROS";
      const categoriaCustom = categoriaRaw && !BASE_CATEGORIAS.some((item) => item.toLowerCase() === categoriaRaw.toLowerCase()) ? categoriaRaw : undefined;

      const payload: FormData = { ...values, categoria: categoriaEnum, categoriaCustom };

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
    });
  }, onInvalid);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nueva incidencia</h1>
          <p className="mt-0.5 text-sm text-slate-500">Cuéntanos qué ha pasado y te ayudamos lo antes posible</p>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-sm hover:bg-slate-50 transition"
          aria-label="Volver al listado"
        >
          <X className="h-4 w-4 text-slate-500" />
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">

        {/* ── Título ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="titulo" className="text-sm font-semibold text-slate-700">Título de la incidencia</Label>
          <Input
            id="titulo"
            {...form.register("titulo")}
            placeholder="Ej: No puedo acceder al correo desde ayer por la tarde"
            className="h-11 text-base"
            aria-required="true"
          />
          {form.formState.errors.titulo && (
            <p className="text-xs text-red-600">{form.formState.errors.titulo.message}</p>
          )}
        </div>

        {/* ── Empresa + Prioridad en la misma fila ─────────── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">

          {/* Empresa(s) */}
          <div className="space-y-2" id="empresa-afectada">
            <Label className="text-sm font-semibold text-slate-700">Empresa afectada</Label>
            <div className="flex flex-wrap gap-2" role="group">
              <button
                type="button"
                onClick={toggleTodas}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  selectedDestinatarios.length === empresas.length
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 hover:bg-slate-50"
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
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${locked ? "cursor-default" : "cursor-pointer"}`}
                    style={{
                      backgroundColor: active ? empresa.color || "#334155" : "transparent",
                      color: active ? "#fff" : undefined,
                      borderColor: empresa.color || "#cbd5e1"
                    }}
                  >
                    {locked && <Lock className="h-3 w-3 opacity-60" />}
                    {empresa.nombre}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.destinatarios && (
              <p className="text-xs text-red-600">{form.formState.errors.destinatarios.message as string}</p>
            )}
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Prioridad</Label>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
              {PRIORIDAD_CONFIG.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => form.setValue("prioridad", p.value, { shouldValidate: true })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    selectedPrioridad === p.value ? p.active : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${selectedPrioridad === p.value ? "bg-white/80" : p.dot}`} />
                  {p.label}
                </button>
              ))}
            </div>
            {/* Urgente shortcut */}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-orange-600"
                checked={selectedPrioridad === "ALTA" || selectedPrioridad === "CRITICA"}
                onChange={(e) => {
                  form.setValue("prioridad", e.target.checked ? "ALTA" : "MEDIA", { shouldValidate: true });
                }}
              />
              <Zap className="h-3 w-3" />
              Es urgente
            </label>
          </div>
        </div>

        {/* ── Descripción ───────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="descripcion" className="text-sm font-semibold text-slate-700">
              Descripción del problema
            </Label>
            <button
              type="button"
              onClick={() => setShowTips((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
            >
              <Info className="h-3.5 w-3.5" />
              Guía para describir bien
              {showTips ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* Tips colapsables */}
          {showTips && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs">
              <ul className="space-y-1.5 text-amber-800">
                <li className="flex items-start gap-2"><span className="shrink-0">🔴</span><span><strong>Qué falla</strong> — qué no funciona y cuándo ocurre</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0">✅</span><span><strong>Cómo debe funcionar</strong> — el comportamiento esperado</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0">❌</span><span><strong>Qué ves exactamente</strong> — mensaje de error, pantalla o síntoma</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0">📷</span><span><strong>Captura</strong> — <kbd className="rounded border border-amber-300 bg-white px-1 font-mono">Impr Pant</kbd> y pega con <kbd className="rounded border border-amber-300 bg-white px-1 font-mono">Ctrl+V</kbd>, o usa <kbd className="rounded border border-amber-300 bg-white px-1 font-mono">Win+Shift+S</kbd></span></li>
              </ul>
            </div>
          )}

          <RichTextEditor
            id="descripcion"
            content={descripcion}
            onChange={(html) => {
              form.setValue("descripcion", html, { shouldValidate: true });
              if (descError) setDescError(null);
            }}
            onImagePaste={uploadPendingImage}
            placeholder="Describe el problema: qué falla, cómo debería funcionar y qué ves exactamente..."
            minHeight="160px"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-red-600">{form.formState.errors.descripcion?.message}</span>
            {descripcionOk ? (
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {caracteres} caracteres — suficiente
              </span>
            ) : (
              <span className={`flex items-center gap-1 font-medium ${caracteres > 0 ? "text-amber-600" : "text-slate-400"}`}>
                <AlertCircle className="h-3.5 w-3.5" />
                {caracteres}/{MIN_CARACTERES} caracteres mínimo
              </span>
            )}
          </div>

          {descError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{descError}</span>
            </div>
          )}
        </div>

        {/* ── Contacto ──────────────────────────────────────── */}
        <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UserRound className="h-4 w-4 text-slate-400" />
            Persona o recurso afectado
            <span className="ml-auto text-xs font-normal text-slate-400">Opcional — ayuda a priorizar</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="contactoNombre" className="text-xs text-slate-500">Nombre / recurso</Label>
              <Input id="contactoNombre" {...form.register("contactoNombre")} placeholder="Rosa, impresora 2ª planta…" />
              {form.formState.errors.contactoNombre && (
                <p className="text-xs text-red-600">{form.formState.errors.contactoNombre.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactoTelefono" className="text-xs text-slate-500">Teléfono de contacto</Label>
              <Input id="contactoTelefono" type="tel" {...form.register("contactoTelefono")} placeholder="612 345 678" />
              {form.formState.errors.contactoTelefono && (
                <p className="text-xs text-red-600">{form.formState.errors.contactoTelefono.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactoEmail" className="text-xs text-slate-500">Email de contacto</Label>
              <Input id="contactoEmail" type="email" {...form.register("contactoEmail")} placeholder="rosa@empresa.com" />
              {form.formState.errors.contactoEmail && (
                <p className="text-xs text-red-600">{form.formState.errors.contactoEmail.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactoReferencia" className="text-xs text-slate-500">URL o referencia</Label>
              <Input id="contactoReferencia" {...form.register("contactoReferencia")} placeholder="https://… o referencia interna" />
              {form.formState.errors.contactoReferencia && (
                <p className="text-xs text-red-600">{form.formState.errors.contactoReferencia.message}</p>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="contactoNotas" className="text-xs text-slate-500">Notas adicionales</Label>
              <Textarea id="contactoNotas" rows={2} {...form.register("contactoNotas")} placeholder="Cualquier contexto extra útil…" />
            </div>
          </div>
        </div>

        {/* ── Categoría ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="categoria-input" className="text-sm font-semibold text-slate-700">Categoría</Label>
          <Input
            id="categoria-input"
            role="combobox"
            list="categoria-options"
            placeholder="Técnico, RRHH, Comercial… o escribe una nueva"
            value={categoriaInput}
            onChange={(e) => setCategoriaInput(e.target.value)}
            className="max-w-sm"
          />
          <datalist id="categoria-options">
            {allCategorias.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Botones ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" disabled={isPending} className="rounded-xl px-6 h-11 text-base font-semibold">
            {isPending ? "Creando ticket…" : "Crear ticket"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/")} className="h-11">
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
