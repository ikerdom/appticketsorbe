"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, ImagePlus, Link2, Lock, Mail, Paperclip, Pencil, Phone, Save, Share2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/compress-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogActions } from "@/components/ui/dialog";
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
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const notas_adjuntos_imgs = adjuntos.filter(a => a.tipo.startsWith("image/"));
  const adjuntoSrc = (adjuntoId: string) => `/api/tickets/${ticket.id}/adjuntos/${adjuntoId}`;
  const lightbox = lightboxIdx !== null && notas_adjuntos_imgs[lightboxIdx]
    ? { ...notas_adjuntos_imgs[lightboxIdx], idx: lightboxIdx }
    : null;
  const [notas, setNotas] = useState(ticket.notas);
  const [nuevaNota, setNuevaNota] = useState("");
  const [descExpanded, setDescExpanded] = useState(true);
  const LONG_DESC = 500;
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const total = notas_adjuntos_imgs.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxIdx(null); return; }
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i === null ? null : (i + 1) % total));
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? null : (i - 1 + total) % total));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lightboxIdx, notas_adjuntos_imgs.length]);
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

  // Historial legible de bloqueos y resoluciones — motivoBloqueo/notaResolucion
  // se sobrescriben en cada ciclo, así que sin esto los motivos/notas anteriores
  // se pierden si el ticket se bloquea o resuelve más de una vez.
  const eventosBloqueoResolucion = useMemo(() => {
    type Evento = { id: string; tipo: "bloqueo" | "resolucion"; texto: string; createdAt: Date; autorNombre: string };
    const eventos: Evento[] = [];
    for (const h of ticket.historial) {
      const detalle = h.detalle as { a?: string; motivoBloqueo?: string; notaResolucion?: string } | null;
      if (!detalle) continue;
      const autorNombre = h.autor?.nombre || h.autor?.name || h.autor?.email || "—";
      if (detalle.a === "BLOQUEADO" && detalle.motivoBloqueo?.trim()) {
        eventos.push({ id: h.id, tipo: "bloqueo", texto: detalle.motivoBloqueo, createdAt: new Date(h.createdAt), autorNombre });
      } else if (detalle.a === "RESUELTO" && detalle.notaResolucion?.trim()) {
        eventos.push({ id: h.id, tipo: "resolucion", texto: detalle.notaResolucion, createdAt: new Date(h.createdAt), autorNombre });
      }
    }
    return eventos.reverse(); // más reciente primero
  }, [ticket.historial]);

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

  // base64 adds ~33% overhead — keep raw file under 3MB so JSON body stays under Vercel's 4.5MB limit
  const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

  async function uploadImageFile(rawFile: File): Promise<boolean> {
    // Comprimir en cliente — capturas de pantalla completa superan 3MB en PNG
    const file = await compressImage(rawFile);
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Imagen demasiado grande (máx 3 MB) incluso comprimida. Recorta la zona relevante.`);
      return false;
    }
    return new Promise<boolean>((resolve) => {
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
            resolve(true);
          } else {
            const body = await res.json().catch(() => ({ error: "Error al subir imagen" }));
            toast.error(body.error ?? "Error al subir imagen");
            resolve(false);
          }
        } catch {
          toast.error("Error al subir imagen");
          resolve(false);
        }
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
    let ok = 0;
    for (const file of imageFiles) { if (await uploadImageFile(file)) ok++; }
    setUploadingImage(false);
    if (ok > 0) toast.success(ok === 1 ? "Imagen adjuntada" : `${ok} imágenes adjuntadas`);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploadingImage(true);
    let ok = 0;
    for (const file of files) { if (await uploadImageFile(file)) ok++; }
    setUploadingImage(false);
    if (ok > 0) toast.success(ok === 1 ? "Imagen adjuntada" : `${ok} imágenes adjuntadas`);
    e.target.value = "";
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploadingImage(true);
    let ok = 0;
    for (const file of files) { if (await uploadImageFile(file)) ok++; }
    setUploadingImage(false);
    if (ok > 0) toast.success(ok === 1 ? "Imagen adjuntada" : `${ok} imágenes adjuntadas`);
  }

  // Dialog genérico de confirmación — sustituye a window.confirm (B003)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    action: () => void | Promise<void>;
  } | null>(null);

  async function deleteTicket() {
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

  function getTicketUrl() {
    return `${window.location.origin}/public/tickets/t/${ticket.numero}`;
  }

  async function copyLink() {
    const url = getTicketUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    toast.success("Enlace copiado. Pégalo donde quieras.");
    setTimeout(() => setCopied(false), 2000);
    setShareOpen(false);
  }

  function shareWhatsApp() {
    const num = `#${String(ticket.numero).padStart(4, "0")}`;
    const text = encodeURIComponent(`Incidencia ${num} — ${ticket.titulo}\n${getTicketUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setShareOpen(false);
  }

  function shareEmail() {
    const num = `#${String(ticket.numero).padStart(4, "0")}`;
    const subject = encodeURIComponent(`[Incidencia ${num}] ${ticket.titulo}`);
    const body = encodeURIComponent(`Te paso esta incidencia:\n\n${getTicketUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareOpen(false);
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
          {/* Share dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-slate-100 transition"
              title="Compartir enlace"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? "Copiado" : "Compartir"}</span>
            </button>
            {shareOpen && (
              <div className="absolute right-0 z-50 mt-1 w-52 rounded-xl border bg-white py-1 shadow-xl">
                <button type="button" onClick={copyLink}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                  <Link2 className="h-4 w-4 text-slate-500" /> Copiar enlace
                </button>
                <button type="button" onClick={shareWhatsApp}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                  <span className="text-base">📱</span> WhatsApp
                </button>
                <button type="button" onClick={shareEmail}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                  <Mail className="h-4 w-4 text-slate-500" /> Correo electrónico
                </button>
              </div>
            )}
          </div>

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

      {/* Historial de bloqueos y resoluciones — se conservan aunque el ticket se bloquee/resuelva varias veces */}
      {eventosBloqueoResolucion.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Historial de bloqueos y resoluciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventosBloqueoResolucion.map((evento) => (
              <div
                key={evento.id}
                className={`flex items-start gap-2 rounded-xl border p-3 ${
                  evento.tipo === "bloqueo"
                    ? "border-red-100 bg-red-50"
                    : "border-emerald-100 bg-emerald-50"
                }`}
              >
                {evento.tipo === "bloqueo" ? (
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${evento.tipo === "bloqueo" ? "text-red-600" : "text-emerald-600"}`}>
                    {evento.tipo === "bloqueo" ? "Bloqueado" : "Resuelto"} por {evento.autorNombre} · {formatDateTimeEs(evento.createdAt)}
                  </p>
                  <p className={`mt-0.5 whitespace-pre-wrap text-sm leading-relaxed ${evento.tipo === "bloqueo" ? "text-red-700" : "text-emerald-800"}`}>
                    {evento.texto}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                <div>
                  <p className={`whitespace-pre-wrap text-sm leading-relaxed ${!descExpanded ? "line-clamp-6" : ""}`}>
                    {ticket.descripcion}
                  </p>
                  {ticket.descripcion.length > LONG_DESC && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
                    >
                      {descExpanded ? "Mostrar menos ▲" : "Mostrar más ▼"}
                    </button>
                  )}
                </div>
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
              {notas_adjuntos_imgs.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {notas_adjuntos_imgs.length} captura{notas_adjuntos_imgs.length > 1 ? "s" : ""} · clic para ampliar
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {notas_adjuntos_imgs.map((adj, idx) => (
                      <button
                        key={adj.id}
                        type="button"
                        onClick={() => setLightboxIdx(idx)}
                        className="group relative block overflow-hidden rounded-xl border-2 border-transparent bg-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        title={adj.nombre}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={adjuntoSrc(adj.id)}
                          alt={adj.nombre}
                          className="h-32 w-auto max-w-[240px] object-cover"
                        />
                        {/* UN solo overlay — antes había dos superpuestos → imagen se veía negra al hover */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition rounded-xl bg-indigo-900/40">
                          <ImagePlus className="h-5 w-5 text-white drop-shadow" />
                          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">Ampliar</span>
                        </div>
                      </button>
                    ))}
                  </div>
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

          {!isAdmin && currentEstado !== "RESUELTO" && ticket.creadorId === currentUserId && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">💡 ¿Ya está resuelta tu incidencia?</p>
              <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                Si el problema ya se solucionó, puedes marcarlo tú mismo como resuelto — no hace falta pedírselo a nadie. Usa el botón <strong>Marcar resuelto</strong> más abajo.
              </p>
            </div>
          )}

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
                      <span className="font-normal text-emerald-600">(obligatorio)</span>
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
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    disabled={!notaResolucion.trim()}
                    onClick={() => void performAction("resolve", { horasDedicadas: horasDedicadas ? parseFloat(horasDedicadas) : undefined, notaResolucion: notaResolucion.trim() })}
                  >
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
                    onClick={() => setConfirmDialog({
                      title: "Archivar ticket",
                      description: "El ticket pasará al histórico y se cerrará definitivamente. ¿Continuar?",
                      confirmLabel: "Archivar",
                      action: () => void performAction("archive")
                    })}
                  >
                    Archivar / Cerrar definitivamente
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmDialog({
                      title: "Eliminar ticket",
                      description: `¿Eliminar permanentemente el ticket #${String(ticket.numero).padStart(4, "0")}? Esta acción no se puede deshacer.`,
                      confirmLabel: "Eliminar",
                      action: deleteTicket
                    })}
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

          {/* Notas internas — solo admins */}
          {isAdmin && (
            <Card className="rounded-2xl border-violet-200 bg-violet-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                  🔒 Notas internas — solo admins
                  <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                    {notas.length} nota{notas.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notas.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-2">Sin notas internas</p>
                ) : (
                  <div className="space-y-2">
                    {notas.map((n) => {
                      const autorName = n.autor.nombre || n.autor.name || n.autor.email;
                      const esPropia = n.autorId === currentUserId;
                      return (
                        <div key={n.id} className="group relative rounded-lg border border-violet-200 bg-white p-3 text-sm shadow-sm">
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-500">
                            🔒 {esPropia ? "Tú" : autorName}
                          </p>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{n.contenido}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400">{formatDateTimeEs(n.createdAt)}</span>
                            <button
                              type="button"
                              className="hidden text-[10px] text-red-400 hover:text-red-600 group-hover:inline"
                              onClick={() => setConfirmDialog({
                                title: "Eliminar nota interna",
                                description: "¿Eliminar esta nota? Solo la ven los admins, pero no se puede recuperar.",
                                confirmLabel: "Eliminar",
                                action: async () => {
                                  const res = await fetch(`/api/tickets/${ticket.id}/notas`, {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ notaId: n.id })
                                  });
                                  if (res.ok) setNotas((prev) => prev.filter((x) => x.id !== n.id));
                                  else toast.error("No se pudo eliminar la nota");
                                }
                              })}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="pt-1">
                  <Textarea
                    rows={2}
                    placeholder="Nota interna — visible para todos los admins…"
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    className="text-sm border-violet-200 focus:ring-violet-400"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
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
                  🔒 Guardar nota interna
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Dialog de confirmación ─────────────────────────────── */}
      {confirmDialog && (
        <Dialog
          open
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
        >
          <DialogActions>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                const { action } = confirmDialog;
                setConfirmDialog(null);
                void action();
              }}
            >
              {confirmDialog.confirmLabel}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Lightbox ───────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition"
            aria-label="Cerrar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev / Next */}
          {notas_adjuntos_imgs.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightbox.idx - 1 + notas_adjuntos_imgs.length) % notas_adjuntos_imgs.length);
                }}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white text-2xl font-bold hover:bg-white/30 transition select-none"
              >‹</button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightbox.idx + 1) % notas_adjuntos_imgs.length);
                }}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white text-2xl font-bold hover:bg-white/30 transition select-none"
              >›</button>
            </>
          )}

          {/* Imagen */}
          <div
            className="flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* bg-white: evita que zonas transparentes del PNG aparezcan negras */}
            <div className="rounded-2xl bg-white shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={adjuntoSrc(lightbox.id)}
                alt={lightbox.nombre}
                className="block h-auto w-auto max-h-[80vh] max-w-[90vw] rounded-2xl"
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2">
              <span className="max-w-[220px] truncate text-sm text-white/80">{lightbox.nombre}</span>
              {notas_adjuntos_imgs.length > 1 && (
                <span className="shrink-0 text-xs text-white/40">{lightbox.idx + 1} / {notas_adjuntos_imgs.length}</span>
              )}
              <a
                href={adjuntoSrc(lightbox.id)}
                download={lightbox.nombre}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30 transition"
              >
                ↓ Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
