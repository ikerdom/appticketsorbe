"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Mail, Pencil, Phone, Save, UserRound, X } from "lucide-react";
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
  const [editingComment, setEditingComment] = useState<{ id: string; contenido: string } | null>(null);
  const conversacionRef = useRef<HTMLDivElement>(null);

  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    contactoNombre: ticket.contactoNombre || "",
    contactoTelefono: ticket.contactoTelefono || "",
    contactoEmail: ticket.contactoEmail || "",
    contactoReferencia: ticket.contactoReferencia || "",
    contactoNotas: ticket.contactoNotas || ""
  });

  const destinos = useMemo(() => ticket.destinos.filter((item) => !item.empresa.isGlobalTarget), [ticket.destinos]);
  const canResolve = ticket.estado !== "RESUELTO";

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

  function saveComment(comentarioId: string, contenido: string) {
    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticket.id}/comentarios/${comentarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "No se pudo editar" }));
        toast.error(body.error ?? "No se pudo editar");
        return;
      }
      const { comentario: updated } = await response.json();
      setComentarios((prev) => prev.map((c) => c.id === comentarioId ? { ...c, contenido: updated.contenido } : c));
      setEditingComment(null);
      toast.success("Comentario editado");
    });
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
          {(isAdmin || ticket.creadorId === currentUserId) && (
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
        <Badge className="border bg-blue-100 text-blue-700">{ticket.estado.replace("_", " ")}</Badge>
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
                  const isEditing = editingComment?.id === item.id;
                  const canEdit = isAdmin || item.autor.id === currentUserId;
                  return (
                    <div key={item.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      {isEditing ? (
                        <div className="w-full max-w-[90%] space-y-1.5">
                          <Textarea
                            value={editingComment.contenido}
                            onChange={(e) => setEditingComment(prev => prev ? { ...prev, contenido: e.target.value } : null)}
                            rows={3}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveComment(item.id, editingComment.contenido)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                              <Check className="h-3 w-3" />Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingComment(null)}
                              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <X className="h-3 w-3" />Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isOwn ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}>
                            {!isOwn && (
                              <p className="mb-1 text-xs font-semibold text-indigo-700">{autorName}</p>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed">{item.contenido}</p>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 px-1">
                            <span className="text-[10px] text-muted-foreground">{formatDateTimeEs(item.createdAt)}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => setEditingComment({ id: item.id, contenido: item.contenido })}
                                className="rounded p-0.5 text-slate-300 hover:text-indigo-500"
                                title="Editar mensaje"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t pt-3">
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Escribe un mensaje..."
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nueva línea</span>
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
              {editingContact ? (
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
                    <Button size="sm" variant="outline" onClick={() => setEditingContact(true)}>
                      Editar contacto
                    </Button>
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

              {ticket.estado !== "EN_CURSO" ? (
                <Button className="w-full" onClick={() => void performAction("take")}>
                  Tomar este ticket
                </Button>
              ) : null}

              {canResolve ? (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Marcar como resuelto</p>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-800">
                      📖 ¿Cómo se solucionó?{" "}
                      <span className="font-normal text-emerald-600">(recomendado — queda en el histórico)</span>
                    </label>
                    <Textarea
                      rows={4}
                      placeholder={"Explica qué pasos seguiste para resolverlo.\nEjemplo: «Se reinició el servicio de correo en el servidor. Causa: cuota llena.»\nAsí la próxima vez será fácil."}
                      value={notaResolucion}
                      onChange={(e) => setNotaResolucion(e.target.value)}
                      className="bg-white text-sm"
                    />
                  </div>
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
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => void performAction("resolve", { horasDedicadas: horasDedicadas ? parseFloat(horasDedicadas) : undefined, notaResolucion: notaResolucion || undefined })}>
                    ✓ Marcar resuelto
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => void performAction("set_estado", { estado: "EN_CURSO" })}>
                  Volver a en curso
                </Button>
              )}

              {isAdmin ? (
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
              ) : null}

              <Link href="/" className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
