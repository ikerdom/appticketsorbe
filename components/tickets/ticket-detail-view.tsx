"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Save, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORIDAD_COLOR, PRIORIDAD_LABELS } from "@/lib/constants";
import { formatDateTimeEs } from "@/lib/dates";
import type { TicketDetailData } from "@/types/ticket";

interface TicketDetailViewProps {
  ticket: TicketDetailData;
  isAdmin: boolean;
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

export function TicketDetailView({ ticket, isAdmin }: TicketDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
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
    toast.success("Incidencia actualizada");
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
      setComment("");
      toast.success("Comentario añadido");
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
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{formatShortId(ticket)}</p>
          <h1 className="text-2xl font-bold">{ticket.titulo}</h1>
        </div>
        <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-slate-100" aria-label="Cerrar y volver">
          <X className="h-4 w-4" />
        </Link>
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

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.descripcion}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Conversación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <details className="rounded-lg border p-3" open>
                <summary className="cursor-pointer text-sm font-medium">Ver mensajes ({ticket.comentarios.length})</summary>
                <div className="mt-3 space-y-3">
                  {ticket.comentarios.length === 0 ? <p className="text-sm text-muted-foreground">Sin mensajes todavía.</p> : null}
                  {ticket.comentarios.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 text-sm">
                      <p className="mb-1 text-xs text-muted-foreground">
                        {item.autor.email} · {formatDateTimeEs(item.createdAt)}
                      </p>
                      <p className="whitespace-pre-wrap">{item.contenido}</p>
                    </div>
                  ))}
                </div>
              </details>

              <div className="space-y-2 border-t pt-3">
                <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Añadir comentario..." />
                <Button onClick={addComment} disabled={isPending}>
                  {isPending ? "Enviando..." : "Publicar comentario"}
                </Button>
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

              {ticket.estado !== "EN_CURSO" ? (
                <Button className="w-full" onClick={() => void performAction("take")}>
                  Coger esta incidencia
                </Button>
              ) : null}

              {canResolve ? (
                <Button className="w-full" onClick={() => void performAction("resolve")}>
                  Marcar resuelta
                </Button>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => void performAction("set_estado", { estado: "EN_CURSO" })}>
                  Volver a en curso
                </Button>
              )}

              {isAdmin ? (
                <Button variant="destructive" className="w-full" onClick={() => void performAction("archive")}>
                  Cerrar
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
