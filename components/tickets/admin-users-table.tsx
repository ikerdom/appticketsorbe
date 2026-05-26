"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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

function displayName(usuario: UsuarioRow | { nombre: string | null; name: string | null; email: string }) {
  return usuario.nombre || usuario.name || usuario.email;
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({ error: fallback }));
  return data.error ?? fallback;
}

export function AdminUsersTable({
  usuarios,
  empresas,
}: {
  usuarios: UsuarioRow[];
  empresas: EmpresaOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [empresaFilter, setEmpresaFilter] = useState<string>("ALL");

  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    nombre: "",
    empresaId: "",
    rol: "USER" as "USER" | "ADMIN",
    password: ""
  });

  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UsuarioRow | null>(null);
  const [confirmRoleUser, setConfirmRoleUser] = useState<UsuarioRow | null>(null);
  const [changeCompanyUser, setChangeCompanyUser] = useState<UsuarioRow | null>(null);
  const [newCompanyId, setNewCompanyId] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuUserId(null);
        closeAllDialogs();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuUserId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      if (empresaFilter !== "ALL" && usuario.empresa.id !== empresaFilter) return false;
      if (roleFilter !== "ALL" && usuario.rol !== roleFilter) return false;
      if (!q) return true;
      return displayName(usuario).toLowerCase().includes(q) || usuario.email.toLowerCase().includes(q);
    });
  }, [usuarios, search, roleFilter, empresaFilter]);

  function closeAllDialogs() {
    setOpenCreate(false);
    setEditUser(null);
    setConfirmRoleUser(null);
    setChangeCompanyUser(null);
  }

  const hasRows = filteredUsers.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEmpresaFilter("ALL")}
            className={`rounded-md border px-3 py-1.5 text-sm ${empresaFilter === "ALL" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Todas
          </button>
          {empresas.map((empresa) => (
            <button
              type="button"
              key={empresa.id}
              onClick={() => setEmpresaFilter(empresa.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${empresaFilter === empresa.id ? "text-white" : ""}`}
              style={empresaFilter === empresa.id ? { backgroundColor: empresa.color || "#64748b" } : undefined}
            >
              {empresa.nombre}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o email" className="w-56" />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "ALL" | "ADMIN" | "USER")}
          >
            <option value="ALL">Todos los roles</option>
            <option value="ADMIN">Solo admins</option>
            <option value="USER">Solo usuarios</option>
          </select>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <p className="text-sm font-medium">Mostrando {filteredUsers.length} usuarios</p>
      </div>

      {!hasRows ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No hay usuarios con los filtros actuales.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card p-3">
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
                return (
                  <TableRow key={usuario.id} className={!usuario.activo ? "opacity-55" : ""}>
                    <TableCell>
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: usuario.empresa.color || "#64748b" }}
                      >
                        {nombre[0]?.toUpperCase() ?? "U"}
                      </div>
                    </TableCell>
                    <TableCell>{nombre}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: usuario.empresa.color || "#64748b" }}>
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
                      <div className="relative inline-block" ref={menuRef}>
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-md border"
                          onClick={() => setMenuUserId((prev) => (prev === usuario.id ? null : usuario.id))}
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </button>
                        {menuUserId === usuario.id ? (
                          <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border bg-white p-1 shadow-xl">
                            <button
                              type="button"
                              className="mb-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-slate-100"
                              onClick={() => setMenuUserId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                              Cerrar
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setEditUser(usuario);
                                setMenuUserId(null);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setChangeCompanyUser(usuario);
                                setNewCompanyId(usuario.empresa.id);
                                setMenuUserId(null);
                              }}
                            >
                              Cambiar empresa
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setConfirmRoleUser(usuario);
                                setMenuUserId(null);
                              }}
                            >
                              {usuario.rol === "ADMIN" ? "Quitar admin" : "Cambiar a admin"}
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                startTransition(async () => {
                                  const response = await fetch(`/api/admin/usuarios/${usuario.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ activo: !usuario.activo })
                                  });
                                  if (!response.ok) {
                                    toast.error(await readError(response, "No se pudo actualizar estado"));
                                    return;
                                  }
                                  toast.success(usuario.activo ? "Usuario desactivado" : "Usuario activado");
                                  router.refresh();
                                });
                                setMenuUserId(null);
                              }}
                            >
                              {usuario.activo ? "Desactivar" : "Activar"}
                            </button>
                            {usuario.rol === "ADMIN" ? (
                              <button
                                type="button"
                                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  startTransition(async () => {
                                    const response = await fetch(`/api/admin/usuarios/${usuario.id}/reset-password`, { method: "PATCH" });
                                    if (!response.ok) {
                                      toast.error(await readError(response, "No se pudo restablecer la contraseña"));
                                      return;
                                    }
                                    toast.success("Contraseña restablecida a la contraseña global");
                                    router.refresh();
                                  });
                                  setMenuUserId(null);
                                }}
                              >
                                Restablecer contraseña
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {openCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => closeAllDialogs()}>
          <div className="w-full max-w-lg rounded-xl border bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nuevo usuario</h3>
              <button type="button" onClick={() => closeAllDialogs()} className="inline-flex h-8 w-8 items-center justify-center rounded-md border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <Input placeholder="Nombre" value={createForm.nombre} onChange={(event) => setCreateForm((prev) => ({ ...prev, nombre: event.target.value }))} />
              <Input placeholder="correo@empresa.com" value={createForm.email} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))} />
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={createForm.empresaId} onChange={(event) => setCreateForm((prev) => ({ ...prev, empresaId: event.target.value }))}>
                <option value="">Empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={createForm.rol} onChange={(event) => setCreateForm((prev) => ({ ...prev, rol: event.target.value === "ADMIN" ? "ADMIN" : "USER" }))}>
                <option value="USER">Usuario</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Input
                type="password"
                placeholder="Contraseña (mín. 4 caracteres)"
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">El usuario podrá cambiarla después desde su perfil.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => closeAllDialogs()}>
                Cancelar
              </Button>
              <Button
                disabled={!createForm.email || !createForm.empresaId || createForm.password.length < 4 || isPending}
                onClick={() => {
                  startTransition(async () => {
                    const response = await fetch("/api/admin/usuarios", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: createForm.email,
                        nombre: createForm.nombre,
                        empresaId: createForm.empresaId,
                        rol: createForm.rol,
                        password: createForm.password
                      })
                    });
                    if (!response.ok) {
                      toast.error(await readError(response, "No se pudo crear usuario"));
                      return;
                    }
                    toast.success("Usuario creado");
                    closeAllDialogs();
                    setCreateForm({ email: "", nombre: "", empresaId: "", rol: "USER", password: "" });
                    router.refresh();
                  });
                }}
              >
                Crear usuario
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => closeAllDialogs()}>
          <div className="w-full max-w-md rounded-xl border bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar usuario</h3>
              <button type="button" onClick={() => closeAllDialogs()} className="inline-flex h-8 w-8 items-center justify-center rounded-md border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Input value={editUser.nombre || editUser.name || ""} onChange={(event) => setEditUser({ ...editUser, nombre: event.target.value })} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => closeAllDialogs()}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  startTransition(async () => {
                    const response = await fetch(`/api/admin/usuarios/${editUser.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ nombre: editUser.nombre || editUser.name || "" })
                    });
                    if (!response.ok) {
                      toast.error(await readError(response, "No se pudo editar el usuario"));
                      return;
                    }
                    toast.success("Usuario actualizado");
                    closeAllDialogs();
                    router.refresh();
                  });
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {changeCompanyUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => closeAllDialogs()}>
          <div className="w-full max-w-md rounded-xl border bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cambiar empresa</h3>
              <button type="button" onClick={() => closeAllDialogs()} className="inline-flex h-8 w-8 items-center justify-center rounded-md border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={newCompanyId} onChange={(event) => setNewCompanyId(event.target.value)}>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => closeAllDialogs()}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  startTransition(async () => {
                    const response = await fetch(`/api/admin/usuarios/${changeCompanyUser.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ empresaId: newCompanyId })
                    });
                    if (!response.ok) {
                      toast.error(await readError(response, "No se pudo cambiar empresa"));
                      return;
                    }
                    toast.success("Empresa actualizada");
                    closeAllDialogs();
                    router.refresh();
                  });
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmRoleUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => closeAllDialogs()}>
          <div className="w-full max-w-md rounded-xl border bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cambiar rol</h3>
              <button type="button" onClick={() => closeAllDialogs()} className="inline-flex h-8 w-8 items-center justify-center rounded-md border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {confirmRoleUser.rol === "ADMIN"
                ? `Quitar permisos de administrador a ${displayName(confirmRoleUser)}?`
                : `Convertir a ${displayName(confirmRoleUser)} en administrador?`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => closeAllDialogs()}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  startTransition(async () => {
                    const rol = confirmRoleUser.rol === "ADMIN" ? "USER" : "ADMIN";
                    const response = await fetch(`/api/admin/usuarios/${confirmRoleUser.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ rol })
                    });
                    if (!response.ok) {
                      toast.error(await readError(response, "No se pudo cambiar rol"));
                      return;
                    }
                    toast.success("Rol actualizado");
                    closeAllDialogs();
                    router.refresh();
                  });
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

