"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Clock, Phone, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeEs } from "@/lib/dates";

type TareaEstado = "PENDIENTE" | "EN_CURSO" | "HECHO";
type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";

interface Tarea {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string | null;
  estado: TareaEstado;
  prioridad: Prioridad;
  empresaId: string;
  creadorId: string;
  asignadoId: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  resueltoAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  empresa: { id: string; nombre: string; color: string | null };
  creador: { id: string; email: string; nombre: string | null; name: string | null };
  asignado: { id: string; email: string; nombre: string | null; name: string | null } | null;
}

interface Props {
  initialTareas: Tarea[];
  isAdmin: boolean;
  currentUserId: string;
  usuarios: { id: string; email: string; nombre: string | null; name: string | null }[];
}

const ESTADO_CONFIG: Record<TareaEstado, { label: string; icon: React.ReactNode; color: string; badge: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    icon: <Circle className="h-4 w-4 text-slate-400" />,
    color: "bg-slate-50 border-slate-200",
    badge: "bg-slate-100 text-slate-600 ring-slate-200"
  },
  EN_CURSO: {
    label: "En curso",
    icon: <Clock className="h-4 w-4 text-amber-500" />,
    color: "bg-amber-50 border-amber-100",
    badge: "bg-amber-100 text-amber-700 ring-amber-200"
  },
  HECHO: {
    label: "Hecho",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    color: "bg-emerald-50 border-emerald-100",
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200"
  }
};

const PRIORIDAD_COLOR: Record<Prioridad, string> = {
  BAJA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-blue-100 text-blue-700",
  ALTA: "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700"
};

function TareaCard({
  tarea,
  isAdmin,
  currentUserId,
  onUpdate,
  onDelete
}: {
  tarea: Tarea;
  isAdmin: boolean;
  currentUserId: string;
  onUpdate: (id: string, data: Partial<Tarea>) => void;
  onDelete: (id: string) => void;
}) {
  const [, startTransition] = useTransition();
  const canDelete = isAdmin || tarea.creadorId === currentUserId;
  const canEdit = isAdmin || tarea.empresaId === tarea.empresaId;

  function moveEstado(estado: TareaEstado) {
    startTransition(async () => {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado })
      });
      if (!res.ok) { toast.error("No se pudo actualizar"); return; }
      const { tarea: updated } = await res.json();
      onUpdate(tarea.id, updated);
    });
  }

  function deleteTarea() {
    if (!confirm("¿Eliminar esta tarea?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/tareas/${tarea.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("No se pudo eliminar"); return; }
      onDelete(tarea.id);
      toast.success("Tarea eliminada");
    });
  }

  const cfg = ESTADO_CONFIG[tarea.estado];
  const nombreCreador = tarea.creador.nombre || tarea.creador.name || tarea.creador.email;

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md ${cfg.color}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-slate-400">#{String(tarea.numero).padStart(3, "0")}</span>
          {isAdmin && (
            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: tarea.empresa.color || "#64748b" }}>
              {tarea.empresa.nombre}
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${PRIORIDAD_COLOR[tarea.prioridad]}`}>
            {tarea.prioridad}
          </span>
        </div>
        {canDelete && (
          <button type="button" onClick={deleteTarea} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-800 leading-snug mb-1">{tarea.titulo}</p>
      {tarea.descripcion && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{tarea.descripcion}</p>
      )}

      {(tarea.contactoNombre || tarea.contactoTelefono) && (
        <div className="mb-2 space-y-0.5 rounded-lg bg-white/60 px-2.5 py-2 text-xs text-slate-600">
          {tarea.contactoNombre && <p className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{tarea.contactoNombre}</p>}
          {tarea.contactoTelefono && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{tarea.contactoTelefono}</p>}
        </div>
      )}

      <p className="mb-3 text-[11px] text-slate-400">Por {nombreCreador} · {formatDateTimeEs(tarea.createdAt)}</p>

      {canEdit && tarea.estado !== "HECHO" && (
        <div className="flex gap-1.5 flex-wrap">
          {tarea.estado === "PENDIENTE" && (
            <button type="button" onClick={() => moveEstado("EN_CURSO")} className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 transition">
              Iniciar →
            </button>
          )}
          {tarea.estado === "EN_CURSO" && (
            <>
              <button type="button" onClick={() => moveEstado("PENDIENTE")} className="rounded-lg border px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition">
                ← Pausar
              </button>
              <button type="button" onClick={() => moveEstado("HECHO")} className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 transition">
                ✓ Marcar hecha
              </button>
            </>
          )}
        </div>
      )}
      {tarea.estado === "HECHO" && tarea.resueltoAt && (
        <p className="text-[11px] text-emerald-600 font-medium">✓ Completada {formatDateTimeEs(tarea.resueltoAt)}</p>
      )}
    </div>
  );
}

interface FormData {
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  contactoNombre: string;
  contactoTelefono: string;
}

export function TareasBoard({ initialTareas, isAdmin, currentUserId, usuarios }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);
  const [showForm, setShowForm] = useState(false);
  const [showHechas, setShowHechas] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormData>({
    titulo: "",
    descripcion: "",
    prioridad: "MEDIA",
    contactoNombre: "",
    contactoTelefono: ""
  });

  const pendientes = tareas.filter(t => t.estado === "PENDIENTE");
  const enCurso = tareas.filter(t => t.estado === "EN_CURSO");
  const hechas = tareas.filter(t => t.estado === "HECHO");

  function updateTarea(id: string, updated: Partial<Tarea>) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
  }

  function deleteTarea(id: string) {
    setTareas(prev => prev.filter(t => t.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          descripcion: form.descripcion || undefined,
          prioridad: form.prioridad,
          contactoNombre: form.contactoNombre || undefined,
          contactoTelefono: form.contactoTelefono || undefined
        })
      });
      if (!res.ok) { toast.error("No se pudo crear la tarea"); return; }
      const { tarea } = await res.json();
      setTareas(prev => [tarea, ...prev]);
      setForm({ titulo: "", descripcion: "", prioridad: "MEDIA", contactoNombre: "", contactoTelefono: "" });
      setShowForm(false);
      toast.success("Tarea creada");
    });
  }

  const columns: { estado: TareaEstado; items: Tarea[] }[] = [
    { estado: "PENDIENTE", items: pendientes },
    { estado: "EN_CURSO", items: enCurso }
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {pendientes.length + enCurso.length} activas
          </span>
        </div>
        <Button
          onClick={() => setShowForm(v => !v)}
          className="bg-indigo-600 hover:bg-indigo-700"
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          Nueva tarea
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="rounded-2xl border-indigo-100 bg-indigo-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nueva tarea</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Título de la tarea *"
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                required
                autoFocus
              />
              <Textarea
                placeholder="Descripción (opcional)"
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.prioridad}
                  onChange={e => setForm(p => ({ ...p, prioridad: e.target.value as Prioridad }))}
                  className="h-10 rounded-md border px-3 text-sm"
                >
                  <option value="BAJA">Prioridad baja</option>
                  <option value="MEDIA">Prioridad media</option>
                  <option value="ALTA">Prioridad alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Contacto / persona"
                  value={form.contactoNombre}
                  onChange={e => setForm(p => ({ ...p, contactoNombre: e.target.value }))}
                />
                <Input
                  placeholder="Teléfono"
                  value={form.contactoTelefono}
                  onChange={e => setForm(p => ({ ...p, contactoTelefono: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {isPending ? "Creando..." : "Crear tarea"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Board */}
      {pendientes.length === 0 && enCurso.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center shadow-sm">
          <p className="mb-1 text-sm font-medium text-slate-600">Sin tareas activas</p>
          <p className="mb-4 text-xs text-slate-400">Crea una tarea para empezar a gestionarla</p>
          <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700" size="sm">
            <Plus className="mr-1 h-4 w-4" /> Nueva tarea
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {columns.map(({ estado, items }) => {
            const cfg = ESTADO_CONFIG[estado];
            return (
              <div key={estado} className="space-y-2.5">
                <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${cfg.color}`}>
                  {cfg.icon}
                  <span className="text-sm font-bold text-slate-700">{cfg.label}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${cfg.badge}`}>{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-400">Sin tareas</div>
                  ) : (
                    items.map(t => (
                      <TareaCard
                        key={t.id}
                        tarea={t}
                        isAdmin={isAdmin}
                        currentUserId={currentUserId}
                        onUpdate={updateTarea}
                        onDelete={deleteTarea}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hechas */}
      {hechas.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHechas(v => !v)}
            className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <span>✓ Tareas completadas · {hechas.length}</span>
            <span className="text-xs text-slate-400">{showHechas ? "Ocultar" : "Ver"}</span>
          </button>
          {showHechas && (
            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {hechas.map(t => (
                <TareaCard
                  key={t.id}
                  tarea={t}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  onUpdate={updateTarea}
                  onDelete={deleteTarea}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
