"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeEs } from "@/lib/dates";

interface UsuarioRow {
  id: string;
  email: string;
  nombre: string | null;
  name: string | null;
  rol: "USER" | "ADMIN";
  createdAt: Date;
  lastSeenAt: Date | null;
  activo: boolean;
  empresa: { id: string; nombre: string; dominio: string; color: string | null };
}

interface EmpresaOption {
  id: string;
  nombre: string;
  dominio: string;
  color: string | null;
}

function displayName(usuario: { nombre: string | null; name: string | null; email: string }) {
  return usuario.nombre || usuario.name || usuario.email;
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({ error: fallback }));
  return data.error ?? fallback;
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminUsersTable({ usuarios, empresas }: { usuarios: UsuarioRow[]; empresas: EmpresaOption[] }) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [empresaFilter, setEmpresaFilter] = useState<string>("ALL");

  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", nombre: "", empresaId: "", rol: "USER" as "USER" | "ADMIN", password: "" });

  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UsuarioRow | null>(null);
  const [confirmRoleUser, setConfirmRoleUser] = useState<UsuarioRow | null>(null);
  const [changeCompanyUser, setChangeCompanyUser] = useState<UsuarioRow | null>(null);
  const [confirmResetUser, setConfirmResetUser] = useState<UsuarioRow | null>(null);
  const [newCompanyId, setNewCompanyId] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (empresaFilter !== "ALL" && u.empresa.id !== empresaFilter) return false;
      if (roleFilter !== "ALL" && u.rol !== roleFilter) return false;
      if (!q) return true;
      return displayName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [usuarios, search, roleFilter, empresaFilter]);

  function closeAll() {
    setOpenCreate(false);
    setEditUser(null);
    setConfirmRoleUser(null);
    setChangeCompanyUser(null);
    setConfirmResetUser(null);
    setMenuUserId(null);
  }

  async function apiPatch(id: string, body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        toast.error(await readError(res, "Error al actualizar"));
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setEmpresaFilter("ALL")}
            className={`rounded-md border px-3 py-1.5 text-sm ${empresaFilter === "ALL" ? "bg-primary text-primary-foreground" : ""}`}>
            Todas
          </button>
          {empresas.map((e) => (
            <button type="button" key={e.id} onClick={() => setEmpresaFilter(e.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${empresaFilter === e.id ? "text-white" : ""}`}
              style={empresaFilter === e.id ? { backgroundColor: e.color || "#64748b" } : undefined}>
              {e.nombre}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o email" className="w-56" />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "ALL" | "ADMIN" | "USER")}>
            <option value="ALL">Todos los roles</option>
            <option value="ADMIN">Solo admins</option>
            <option value="USER">Solo usuarios</option>
          </select>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />Nuevo usuario
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <p className="text-sm font-medium">{filteredUsers.length} usuarios</p>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No hay usuarios con los filtros actuales.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Última actividad</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((usuario) => {
                const nombre = displayName(usuario);
                const menuOpen = menuUserId === usuario.id;
                return (
                  <TableRow key={usuario.id} className={!usuario.activo ? "opacity-55" : ""}>
                    <TableCell>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: usuario.empresa.color || "#64748b" }}>
                        {nombre[0]?.toUpperCase() ?? "U"}
                      </div>
                    </TableCell>
                    <TableCell>{nombre}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: usuario.empresa.color || "#64748b" }}>
                        {usuario.empresa.nombre}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${usuario.rol === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>
                        {usuario.rol === "ADMIN" ? "Admin" : "Usuario"}
                      </span>
                    </TableCell>
                    <TableCell>{usuario.lastSeenAt ? formatRelativeEs(usuario.lastSeenAt) : "Nunca"}</TableCell>
                    <TableCell>
                      <div className="relative inline-block">
                        <button type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-slate-50"
                          onClick={() => setMenuUserId(menuOpen ? null : usuario.id)}>
                          <EllipsisVertical className="h-4 w-4" />
                        </button>

                        {/* Backdrop para cerrar el menú */}
                        {menuOpen && (
                          <div className="fixed inset-0 z-30" onClick={() => setMenuUserId(null)} />
                        )}

                        {menuOpen && (
                          <div className="absolute right-0 z-40 mt-1 w-52 rounded-xl border bg-white py-1 shadow-xl">
                            <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                              onClick={() => { setEditUser(usuario); setMenuUserId(null); }}>
                              Editar nombre
                            </button>
                            <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                              onClick={() => { setChangeCompanyUser(usuario); setNewCompanyId(usuario.empresa.id); setMenuUserId(null); }}>
                              Cambiar empresa
                            </button>
                            <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                              onClick={() => { setConfirmRoleUser(usuario); setMenuUserId(null); }}>
                              {usuario.rol === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                            </button>
                            <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                              onClick={async () => {
                                setMenuUserId(null);
                                const ok = await apiPatch(usuario.id, { activo: !usuario.activo });
                                if (ok) { toast.success(usuario.activo ? "Usuario desactivado" : "Usuario activado"); router.refresh(); }
                              }}>
                              {usuario.activo ? "Desactivar" : "Activar"}
                            </button>
                            <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                              onClick={() => { setConfirmResetUser(usuario); setMenuUserId(null); }}>
                              Restablecer contraseña
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal: Crear usuario */}
      {openCreate && (
        <Modal title="Nuevo usuario" onClose={closeAll}>
          <div className="grid gap-3">
            <Input placeholder="Nombre" value={createForm.nombre} onChange={(e) => setCreateForm(p => ({ ...p, nombre: e.target.value }))} />
            <Input placeholder="correo@empresa.com" value={createForm.email} onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))} />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={createForm.empresaId}
              onChange={(e) => setCreateForm(p => ({ ...p, empresaId: e.target.value }))}>
              <option value="">Empresa</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={createForm.rol}
              onChange={(e) => setCreateForm(p => ({ ...p, rol: e.target.value === "ADMIN" ? "ADMIN" : "USER" }))}>
              <option value="USER">Usuario</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Input type="password" placeholder="Contraseña (mín. 4 caracteres)" value={createForm.password}
              onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={closeAll}>Cancelar</Button>
            <Button disabled={!createForm.email || !createForm.empresaId || createForm.password.length < 4 || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch("/api/admin/usuarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(createForm)
                  });
                  if (!res.ok) { toast.error(await readError(res, "No se pudo crear")); return; }
                  toast.success("Usuario creado");
                  closeAll();
                  setCreateForm({ email: "", nombre: "", empresaId: "", rol: "USER", password: "" });
                  router.refresh();
                } finally { setSaving(false); }
              }}>
              {saving ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal: Editar nombre */}
      {editUser && (
        <Modal title="Editar nombre" onClose={closeAll}>
          <Input value={editUser.nombre || editUser.name || ""}
            onChange={(e) => setEditUser({ ...editUser, nombre: e.target.value })} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={closeAll}>Cancelar</Button>
            <Button disabled={saving} onClick={async () => {
              const ok = await apiPatch(editUser.id, { nombre: editUser.nombre || editUser.name || "" });
              if (ok) { toast.success("Nombre actualizado"); closeAll(); router.refresh(); }
            }}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal: Cambiar empresa */}
      {changeCompanyUser && (
        <Modal title="Cambiar empresa" onClose={closeAll}>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={newCompanyId}
            onChange={(e) => setNewCompanyId(e.target.value)}>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={closeAll}>Cancelar</Button>
            <Button disabled={saving} onClick={async () => {
              const ok = await apiPatch(changeCompanyUser.id, { empresaId: newCompanyId });
              if (ok) { toast.success("Empresa actualizada"); closeAll(); router.refresh(); }
            }}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal: Confirmar reset contraseña */}
      {confirmResetUser && (
        <Modal title="Restablecer contraseña" onClose={closeAll}>
          <p className="text-sm text-muted-foreground">
            ¿Restablecer la contraseña de <strong>{displayName(confirmResetUser)}</strong> a <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">1234</code>?
          </p>
          <p className="mt-1 text-xs text-amber-600">El usuario deberá cambiarla en su próximo inicio de sesión.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={closeAll}>Cancelar</Button>
            <Button variant="destructive" disabled={saving} onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch(`/api/admin/usuarios/${confirmResetUser.id}/reset-password`, { method: "PATCH" });
                if (!res.ok) { toast.error(await readError(res, "No se pudo restablecer")); return; }
                toast.success("Contraseña restablecida a 1234");
                closeAll();
                router.refresh();
              } finally { setSaving(false); }
            }}>
              {saving ? "Restableciendo..." : "Sí, restablecer"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal: Confirmar cambio de rol */}
      {confirmRoleUser && (
        <Modal title="Cambiar rol" onClose={closeAll}>
          <p className="text-sm text-muted-foreground">
            {confirmRoleUser.rol === "ADMIN"
              ? `¿Quitar permisos de administrador a ${displayName(confirmRoleUser)}?`
              : `¿Convertir a ${displayName(confirmRoleUser)} en administrador?`}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={closeAll}>Cancelar</Button>
            <Button disabled={saving} onClick={async () => {
              const nuevoRol = confirmRoleUser.rol === "ADMIN" ? "USER" : "ADMIN";
              const ok = await apiPatch(confirmRoleUser.id, { rol: nuevoRol });
              if (ok) { toast.success("Rol actualizado"); closeAll(); router.refresh(); }
            }}>
              {saving ? "Guardando..." : "Confirmar"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
