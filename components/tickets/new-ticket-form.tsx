"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FileText, Lock, Paperclip, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { nuevoTicketSchema } from "@/lib/validations";
import { useUploadThing } from "@/lib/uploadthing";
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

  // Attachments — images get preview, PDFs and others get icon
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string | null; esImagen: boolean }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("ticketAttachment");

  const ACCEPTED_TYPES = ["image/*", "application/pdf", ".docx", ".xlsx", ".zip"];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  function addFiles(files: File[]) {
    const tooLarge = files.filter((f) => f.size > MAX_SIZE);
    if (tooLarge.length) toast.error(`${tooLarge.map((f) => f.name).join(", ")} supera el límite y no se añadirá`);
    const valid = files.filter((f) => f.size <= MAX_SIZE).slice(0, 15);
    setPendingFiles((prev) => [
      ...prev,
      ...valid.map((file) => {
        const esImagen = file.type.startsWith("image/");
        return { file, preview: esImagen ? URL.createObjectURL(file) : null, esImagen };
      })
    ]);
  }

  // Mantener compatibilidad con addImageFiles para paste/drag
  function addImageFiles(files: File[]) {
    addFiles(files.filter((f) => f.type.startsWith("image/")));
  }

  function handlePaste(e: React.ClipboardEvent) {
    const imgs = Array.from(e.clipboardData.items)
      .filter((i) => i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter(Boolean) as File[];
    if (!imgs.length) return;
    e.preventDefault();
    addImageFiles(imgs);
    toast.success(imgs.length === 1 ? "Imagen añadida" : `${imgs.length} imágenes añadidas`);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => {
      if (prev[idx].preview) URL.revokeObjectURL(prev[idx].preview!);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function uploadPendingFiles(ticketId: string) {
    if (!pendingFiles.length) return;

    // Intentar via uploadthing primero
    try {
      const uploaded = await startUpload(pendingFiles.map((f) => f.file));
      for (const file of uploaded ?? []) {
        await fetch(`/api/tickets/${ticketId}/adjuntos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadthingUrl: file.ufsUrl,
            nombre: file.name,
            tipo: file.type,
            tamano: file.size
          })
        }).catch(() => null);
      }
      return;
    } catch {
      // Fallback base64 solo para imágenes si uploadthing falla
    }

    for (const { file, esImagen } of pendingFiles) {
      if (!esImagen) continue; // sin uploadthing no podemos subir PDFs
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          const base64 = dataUrl.split(",")[1];
          await fetch(`/api/tickets/${ticketId}/adjuntos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name || `imagen-${Date.now()}.png`, tipo: file.type || "image/png", base64 })
          }).catch(() => null);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
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

      // Upload pending files (non-blocking — ticket already created)
      if (pendingFiles.length > 0) {
        await uploadPendingFiles(ticket.id);
      }

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
            <div
              className={`relative rounded-xl transition ${dragOver ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addImageFiles(Array.from(e.dataTransfer.files)); }}
            >
              <Textarea
                id="descripcion"
                rows={8}
                {...form.register("descripcion")}
                className={`min-h-[160px] ${dragOver ? "border-indigo-400" : ""}`}
                placeholder={dragOver ? "Suelta las imágenes aquí…" : undefined}
                onPaste={handlePaste}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{form.formState.errors.descripcion?.message}</span>
              <span>{descripcion.length} caracteres</span>
            </div>

            {/* File picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.docx,.xlsx,.zip"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Adjuntar archivo
              </button>
              <span className="text-[11px] text-muted-foreground">imágenes, PDF, Word · o Ctrl+V · arrastra</span>
            </div>

            {/* Pending file thumbnails */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {pendingFiles.map(({ preview, file, esImagen }, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-lg border shadow-sm bg-white">
                    {esImagen && preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={file.name} className="h-24 w-auto max-w-[180px] object-cover" />
                    ) : (
                      <div className="flex h-24 w-28 flex-col items-center justify-center gap-1 px-2">
                        <FileText className="h-8 w-8 text-red-400" />
                        <span className="line-clamp-2 text-center text-[10px] text-slate-500">{file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center">
                  <span className="text-xs text-slate-400">
                    {pendingFiles.length} archivo{pendingFiles.length !== 1 ? "s" : ""}
                    {isUploading ? " · subiendo…" : ""}
                  </span>
                </div>
              </div>
            )}
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

