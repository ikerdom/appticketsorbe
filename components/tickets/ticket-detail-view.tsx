"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Mail, Paperclip, Pencil, Phone, Save, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORIDAD_COLOR, PRIORIDAD_LABELS } from "@/lib/constants";
import { formatDateTimeEs } from "@/lib/dates";
import type { TicketDetailData } from "@/types/ticket";
import { TicketLifecycle } from "@/components/tickets/ticket-lifecycle";

interface TicketDetailViewProps {
  ticket: TicketDetailData;
  isAdmin: boolean;
  currentUserId: string;
}

function formatShortId(ticket: TicketDetailData) {
  const slug = ticket.empresaOrigen.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");
  return `#${slug}-${String(ticket.numero).padStart(4, "0")}`;
}

export function TicketDetailView({ ticket, isAdmin, currentUserId }: TicketDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [comentarios, setComentarios] = useState(ticket.comentarios);
  const [horasDedicadas, setHorasDedicadas] = useState<string>(ticket.horasDedicadas ? String(ticket.horasDedicadas) : "");
  const [notaResolucion, setNotaResolucion] = useState<string>(ticket.notaResolucion || "");
  const [editingTicket, setEditingTicket] = useState(false);
  const [editForm, setEditForm] = useState({
    titulo: ticket.titulo,
    descripcion: ticket.descripcion,
    prioridad: ticket.prioridad as string,
    categoria: ticket.categoria as string,
    categoriaCustom: ticket.categoriaCustom || ""
  });

  // Edición de comentarios: { id: string; contenido: string } | null
  const conversacionRef = useRef<HTMLDivElement>(null);

  const [adjuntos, setAdjuntos] = useState(ticket.adjuntos);
  const [notas, setNotas] = useState(ticket.notas);
  const [nuevaNota, setNuevaNota] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    contactoNombre: ticket.contactoNombre || "",
    contactoTelefono: ticket.contactoTelefono || "",
    contactoEmail: ticket.contactoEmail || "",
    contactoReferencia: ticket.contactoReferencia || "",
    contactoNotas: ticket.contactoNotas || ""
  });

  const [currentEstado, setCurrentEstado] = useState(ticket.estado);

  const destinos = useMemo(() => ticket.destinos.filter((item) => !item.empresa.isGlobalTarget), [ticket.destinos]);
  const canResolve = currentEstado !== "RESUELTO";

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push("/");
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [router]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (conversacionRef.current) {
      conversacionRef.current.scrollTop = conversacionRef.current.scrollHeight;
    }
  }, [comentarios]);

  async function performAction(action: string, payload?: Record<string, unknown>) {
    const response = await fetch(`/api/tickets/${ticket.id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "No se pudo ejecutar la acción." }));
      toast.error(body.error ?? "No se pudo ejecutar la acción.");
      return;
    }
    const { ticket: updated } = await response.json();
    setCurrentEstado(updated.estado);
    toast.success("Ticket actualizado");
    router.refresh();
  }

  function addComment() {
    if (!comment.trim()) return;
    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticket.id}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: comment })
      });
      if (!response.ok) {
        toast.error("No se pudo enviar el comentario");
        return;
      }
      const { comentario } = await response.json();
      setComentarios((prev) => [...prev, comentario]);
      setComment("");
      toast.success("Comentario añadido");
    });
  }

  async function uploadImageFile(file: File) {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        const filename = file.name || `imagen-${Date.now()}.png`;
        try {
          const res = await fetch(`/api/tickets/${ticket.id}/adjuntos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename, tipo: file.type || "image/png", base64 })
          });
          if (res.ok) {
            const { adjuntos: [adj] } = await res.json();
            setAdjuntos((prev) => [...prev, adj]);
          } else {
            const body = await res.json().catch(() => ({ error: "Error al subir imagen" }));
            toast.error(body.error ?? "Error al subir imagen");
          }
        } catch {
          toast.error("Error al subir imagen");
        }
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImagePaste(e: React.ClipboardEvent) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((i) => i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter(Boolean) as File[];
    if (!imageFiles.length) return;
    e.preventDefault();
    setUploadingImage(true);
    for (const file of imageFiles) await uploadImageFile(file);
    setUploadingImage(false);
    toast.success(imageFiles.length === 1 ? "Imagen adjuntada" : `${imageFiles.length} imágenes adjuntadas`);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploadingImage(true);
    for (const file of files) await uploadImageFile(file);
    setUploadingImage(false);
    toast.success(files.length === 1 ? "Imagen adjuntada" : `${files.length} imágenes adjuntadas`);
    e.target.value = "";
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploadingImage(true);
    for (const file of files) await uploadImageFile(file);
    setUploadingImage(false);
    toast.success(files.length === 1 ? "Imagen adjuntada" : `${files.length} imágenes adjuntadas`);
  }

  async function deleteTicket() {
    if (!confirm("¿Eliminar este ticket permanentemente? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Ticket eliminado");
      router.push("/");
    } else {
      toast.error("No se pudo eliminar el ticket");
    }
  }

  function saveEdicion() {
    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editForm.titulo,
          descripcion: editForm.descripcion,
          prioridad: editForm.prioridad || undefined,
          categoria: editForm.categoria || undefined,
          categoriaCustom: editForm.categoriaCustom || undefined
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "No se pudo guardar" }));
        toast.error(body.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Ticket actualizado");
      setEditingTicket(false);
      router.refresh();
    });
  }

  function saveContact() {
    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticket.id}/contacto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "No se pudo guardar el contacto" }));
        toast.error(body.error ?? "No se pudo guardar el contacto");
        return;
      }

      toast.success("Contacto actualizado");
      setEditingContact(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{formatShortId(ticket)}</p>
          {editingTicket ? (
            <Input
              value={editForm.titulo}
              onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
              className="mt-1 text-xl font-bold"
            />
          ) : (
            <h1 className="text-2xl font-bold">{ticket.titulo}</h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && currentEstado !== "RESUELTO" && (
            editingTicket ? (
              <div className="flex gap-1">
                <Button size="sm" onClick={saveEdicion} disabled={isPending}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />Guardar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingTicket(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditingTicket(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
              </Button>
            )
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-slate-100"
            aria-label="Volver al listado"
            title="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Volver al listado</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border bg-blue-100 text-blue-700">{currentEstado.replace("_", " ")}</Badge>
        <Badge className={PRIORIDAD_COLOR[ticket.prioridad]}>{PRIORIDAD_LABELS[ticket.prioridad]}</Badge>
        {destinos.map((destino) => (
          <Badge key={destino.id} className="border-transparent text-white" style={{ backgroundColor: destino.empresa.color || "#64748b" }}>
            {destino.empresa.nombre}
          </Badge>
        ))}
      </div>

      {/* Lifecycle timeline */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Ciclo de vida · Tiempos</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketLifecycle
            createdAt={ticket.createdAt}
            resueltoAt={ticket.resueltoAt}
            historial={ticket.historial}
            horasDedicadas={ticket.horasDedicadas}
            estado={ticket.estado}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              {editingTicket ? (
                <div className="space-y-3">
                  <Textarea
                    value={editForm.descripcion}
                    onChange={(e) => setEditForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    rows={6}
                    className="text-sm"
                    placeholder="Descripción del ticket..."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Prioridad</label>
                      <select
                        value={editForm.prioridad}
                        onChange={(e) => setEditForm(prev => ({ ...prev, prioridad: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="BAJA">Baja</option>
                        <option value="MEDIA">Media</option>
                        <option value="ALTA">Alta</option>
                        <option value="CRITICA">Crítica</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Categoría</label>
                      <select
                        value={editForm.categoria}
                        onChange={(e) => setEditForm(prev => ({ ...prev, categoria: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="TECNICO">Técnico</option>
                        <option value="ADMINISTRATIVO">Administrativo</option>
                        <option value="COMERCIAL">Comercial</option>
                        <option value="RRHH">RRHH</option>
                        <option value="OTROS">Otros</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Categoría personalizada (opcional)</label>
                    <Input
                      value={editForm.categoriaCustom}
                      onChange={(e) => setEditForm(prev => ({ ...prev, categoriaCustom: e.target.value }))}
                      placeholder="Ej: Impresora, VPN, SAP..."
                    />
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{ticket.descripcion}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Conversación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div ref={conversacionRef} className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {comentarios.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Sin mensajes todavía. Sé el primero en comentar.</p>
                ) : null}
                {comentarios.map((item) => {
                  const isOwn = item.autor.id === currentUserId;
                  const autorName = item.autor.nombre || item.autor.name || item.autor.email;
                  return (
                    <div key={item.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isOwn ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}>
                        {!isOwn && (
                          <p className="mb-1 text-xs font-semibold text-indigo-700">{autorName}</p>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{item.contenido}</p>
                      </div>
                      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{formatDateTimeEs(item.createdAt)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Image gallery */}
              {adjuntos.filter((a) => a.tipo.startsWith("image/")).length > 0 && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {adjuntos.filter((a) => a.tipo.startsWith("image/")).map((adj) => (
                    <a
                      key={adj.id}
                      href={adj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block overflow-hidden rounded-lg border shadow-sm hover:shadow-md transition"
                      title={adj.nombre}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={adj.url}
                        alt={adj.nombre}
                        className="h-28 w-auto max-w-[220px] object-cover transition group-hover:opacity-85"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20 rounded-lg">
                        <ImagePlus className="h-5 w-5 text-white drop-shadow" />
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Composer */}
              <div
                className={`space-y-2 border-t pt-3 ${dragOver ? "rounded-xl ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={dragOver ? "Suelta la imagen aquí…" : "Escribe un mensaje…"}
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                  onPaste={handleImagePaste}
                  className={dragOver ? "border-indigo-400" : ""}
                />
                <div className="flex items-center gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition disabled:opacity-50"
                    title="Adjuntar imagen"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {uploadingImage ? "Subiendo…" : "Imagen"}
                  </button>
                  <span className="flex-1 text-[11px] text-muted-foreground">
                    Ctrl+V · arrastra · o haz clic en Imagen
                  </span>
                  <Button onClick={addComment} disabled={isPending || !comment.trim()}>
                    {isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Persona o recurso afectado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {isAdmin && editingContact ? (
                <div className="space-y-2">
                  <Input placeholder="Nombre / recurso" value={contactForm.contactoNombre} onChange={(e) => setContactForm((prev) => ({ ...prev, contactoNombre: e.target.value }))} />
                  <Input placeholder="Teléfono" value={contactForm.contactoTelefono} onChange={(e) => setContactForm((prev) => ({ ...prev, contactoTelefono: e.target.value }))} />
                  <Input placeholder="Email" value={contactForm.contactoEmail} onChange={(e) => setContactForm((prev) => ({ ...prev, contactoEmail: e.target.value }))} />
                  <Input placeholder="URL o referencia" value={contactForm.contactoReferencia} onChange={(e) => setContactForm((prev) => ({ ...prev, contactoReferencia: e.target.value }))} />
                  <Textarea placeholder="Notas" value={contactForm.contactoNotas} onChange={(e) => setContactForm((prev) => ({ ...prev, contactoNotas: e.target.value }))} rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveContact} disabled={isPending}>
                      <Save className="mr-2 h-4 w-4" /> Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingContact(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p><strong>Nombre / recurso:</strong> {ticket.contactoNombre || "-"}</p>
                  <p><strong>Teléfono:</strong> {ticket.contactoTelefono || "-"}</p>
                  <p><strong>Email:</strong> {ticket.contactoEmail || "-"}</p>
                  <p><strong>URL / referencia:</strong> {ticket.contactoReferencia || ticket.personaAfectada || "-"}</p>
                  <p><strong>Notas:</strong> {ticket.contactoNotas || "-"}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ticket.contactoTelefono ? (
                      <a href={`tel:${ticket.contactoTelefono}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-100">
                        <Phone className="h-3.5 w-3.5" />
                        Llamar
                      </a>
                    ) : null}
                    {ticket.contactoEmail ? (
                      <a href={`mailto:${ticket.contactoEmail}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-100">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    ) : null}
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => setEditingContact(true)}>
                        Editar contacto
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Empresa afectada: {destinos.map((d) => d.empresa.nombre).join(", ")}</p>
              <p className="text-xs text-muted-foreground">Categoría: {ticket.categoriaCustom || ticket.categoria}</p>
              <p className="text-xs text-muted-foreground">Gestionando: {ticket.asignado?.email || "Sin coger"}</p>
              <p className="text-xs text-muted-foreground">Creado: {formatDateTimeEs(ticket.createdAt)}</p>
              <p className="text-xs text-muted-foreground">Actualizado: {formatDateTimeEs(ticket.updatedAt)}</p>
              {ticket.resueltoAt ? <p className="text-xs text-muted-foreground">Resuelto: {formatDateTimeEs(ticket.resueltoAt)}</p> : null}
              {ticket.horasDedicadas != null ? (
                <p className="text-xs text-muted-foreground">Horas dedicadas: {ticket.horasDedicadas}h</p>
              ) : null}
              {ticket.notaResolucion ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    📖 Cómo se resolvió
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-emerald-900 leading-relaxed">{ticket.notaResolucion}</p>
                </div>
              ) : ticket.estado === "RESUELTO" ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-400">Sin solución documentada</p>
                </div>
              ) : null}

              {isAdmin && currentEstado !== "EN_CURSO" && currentEstado !== "RESUELTO" ? (
                <Button className="w-full" onClick={() => void performAction("take")}>
                  Marcar en curso
                </Button>
              ) : null}

              {canResolve ? (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Marcar como resuelto</p>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-800">
                      📖 ¿Cómo se solucionó?{" "}
                      <span className="font-normal text-emerald-600">(recomendado)</span>
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Explica brevemente cómo se resolvió..."
                      value={notaResolucion}
                      onChange={(e) => setNotaResolucion(e.target.value)}
                      className="bg-white text-sm"
                    />
                  </div>
                  {isAdmin && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-emerald-800">⏱ Horas dedicadas <span className="font-normal text-emerald-600">(opcional)</span></label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="ej: 2.5"
                        value={horasDedicadas}
                        onChange={(e) => setHorasDedicadas(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => void performAction("resolve", { horasDedicadas: horasDedicadas ? parseFloat(horasDedicadas) : undefined, notaResolucion: notaResolucion || undefined })}>
                    ✓ Marcar resuelto
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                  <p className="text-sm font-semibold text-emerald-700">✓ Ticket resuelto</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Este ticket está cerrado y no se puede editar</p>
                </div>
              )}

              {isAdmin ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (!confirm("¿Seguro que quieres archivar este ticket?")) return;
                      void performAction("archive");
                    }}
                  >
                    Archivar / Cerrar definitivamente
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => void deleteTicket()}
                  >
                    🗑 Eliminar ticket
                  </Button>
                </>
              ) : null}

              <Link href="/" className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
              </Link>
            </CardContent>
          </Card>

          {/* Notas: compartidas entre admins / privadas para usuarios */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                📝 Notas
                {isAdmin && (
                  <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    Compartidas entre admins
                  </span>
                )}
                {!isAdmin && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Solo tú las ves
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notas.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-2">Sin notas</p>
              ) : (
                <div className="space-y-2">
                  {notas.map((n) => {
                    const autorName = n.autor.nombre || n.autor.name || n.autor.email;
                    const esPropia = n.autorId === currentUserId;
                    return (
                      <div key={n.id} className="group relative rounded-lg border bg-amber-50 p-2.5 text-sm">
                        {isAdmin && !esPropia && (
                          <p className="mb-1 text-[10px] font-semibold text-violet-600">{autorName}</p>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{n.contenido}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">{formatDateTimeEs(n.createdAt)}</span>
                          {(isAdmin || esPropia) && (
                            <button
                              type="button"
                              className="hidden text-[10px] text-red-400 hover:text-red-600 group-hover:inline"
                              onClick={async () => {
                                if (!confirm("¿Eliminar esta nota?")) return;
                                const res = await fetch(`/api/tickets/${ticket.id}/notas`, {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ notaId: n.id })
                                });
                                if (res.ok) setNotas((prev) => prev.filter((x) => x.id !== n.id));
                                else toast.error("No se pudo eliminar la nota");
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Textarea
                  rows={2}
                  placeholder={isAdmin ? "Nota interna (visible para todos los admins)…" : "Nota privada (solo tú la ves)…"}
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={!nuevaNota.trim()}
                onClick={async () => {
                  const res = await fetch(`/api/tickets/${ticket.id}/notas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contenido: nuevaNota.trim() })
                  });
                  if (!res.ok) { toast.error("No se pudo guardar la nota"); return; }
                  const { nota } = await res.json();
                  setNotas((prev) => [...prev, nota]);
                  setNuevaNota("");
                  toast.success("Nota guardada");
                }}
              >
                Guardar nota
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
