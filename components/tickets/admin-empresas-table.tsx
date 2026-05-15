"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EmpresaRow = {
  id: string;
  nombre: string;
  dominio: string;
  color: string | null;
  logoUrl: string | null;
  descripcionCorta: string | null;
  _count: { usuarios: number; ticketsOrigen: number; ticketsDestino: number };
};

export function AdminEmpresasTable({ empresas }: { empresas: EmpresaRow[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [selected, setSelected] = useState<EmpresaRow | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const [nombre, setNombre] = useState("");
  const [dominio, setDominio] = useState("");
  const [color, setColor] = useState("#64748b");
  const [logoUrl, setLogoUrl] = useState("");
  const [descripcionCorta, setDescripcionCorta] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setOpenCreate(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function loadFormFromEmpresa(empresa: EmpresaRow) {
    setNombre(empresa.nombre);
    setDominio(empresa.dominio);
    setColor(empresa.color || "#64748b");
    setLogoUrl(empresa.logoUrl || "");
    setDescripcionCorta(empresa.descripcionCorta || "");
  }

  function openEdit(empresa: EmpresaRow) {
    setSelected(empresa);
    loadFormFromEmpresa(empresa);
  }

  function resetCreate() {
    setNombre("");
    setDominio("");
    setColor("#64748b");
    setLogoUrl("");
    setDescripcionCorta("");
  }

  function saveEmpresa() {
    if (!selected) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/empresas/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, color, logoUrl, descripcionCorta })
      });
      if (!response.ok) {
        toast.error("No se pudo actualizar la empresa");
        return;
      }
      toast.success("Empresa actualizada");
      setSelected(null);
      router.refresh();
    });
  }

  function createEmpresa() {
    startTransition(async () => {
      const response = await fetch("/api/admin/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, dominio, color, logoUrl, descripcionCorta })
      });
      if (!response.ok) {
        toast.error("No se pudo crear la empresa");
        return;
      }
      toast.success("Empresa creada");
      setOpenCreate(false);
      resetCreate();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            resetCreate();
            setOpenCreate(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva empresa
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card p-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dominio</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead>Tickets</TableHead>
              <TableHead>Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((empresa) => (
              <TableRow key={empresa.id}>
                <TableCell className="font-medium">{empresa.nombre}</TableCell>
                <TableCell>{empresa.dominio}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: empresa.color || "#64748b" }} />
                    {empresa.color || "#64748b"}
                  </span>
                </TableCell>
                <TableCell>{empresa._count.usuarios}</TableCell>
                <TableCell>{empresa._count.ticketsOrigen + empresa._count.ticketsDestino}</TableCell>
                <TableCell>
                  <Button variant="outline" onClick={() => openEdit(empresa)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-xl border bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar empresa</h3>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md border" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Nombre" />
              <Input value={dominio} readOnly className="bg-slate-100" />
              <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="Logo URL (opcional)" />
              <Input value={descripcionCorta} onChange={(event) => setDescripcionCorta(event.target.value)} placeholder="Descripción corta (opcional)" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button onClick={saveEmpresa} disabled={isPending}>{isPending ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {openCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenCreate(false)}>
          <div className="w-full max-w-lg rounded-xl border bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nueva empresa</h3>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md border" onClick={() => setOpenCreate(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Nombre" />
              <Input value={dominio} onChange={(event) => setDominio(event.target.value)} placeholder="Dominio" />
              <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="Logo URL (opcional)" />
              <Input value={descripcionCorta} onChange={(event) => setDescripcionCorta(event.target.value)} placeholder="Descripción corta (opcional)" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
              <Button onClick={createEmpresa} disabled={isPending || !nombre || !dominio}>{isPending ? "Creando..." : "Crear"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
