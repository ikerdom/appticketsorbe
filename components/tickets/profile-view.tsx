"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProfileData = {
  email: string;
  nombre: string | null;
  empresa: string;
  rol: string;
  image: string | null;
  stats: {
    creados: number;
    asignados: number;
    resueltos: number;
  };
};

export function ProfileView({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(profile.nombre ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const form = new FormData();
      form.append("nombre", nombre);
      if (avatar) form.append("avatar", avatar);
      const response = await fetch("/api/perfil", { method: "PATCH", body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "No se pudo guardar" }));
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Perfil actualizado");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Perfil de usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            Puedes cambiar: nombre y avatar.
            <br />
            No puedes cambiar: email, empresa y rol.
            <br />
            La contraseña de administradores es global para toda la app.
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border">
              {profile.image ? (
                <Image src={profile.image} alt="Avatar" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-lg font-semibold">
                  {(profile.email[0] || "U").toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Email:</strong> {profile.email}
              </p>
              <p>
                <strong>Empresa:</strong> {profile.empresa}
              </p>
              <p>
                <strong>Rol:</strong> {profile.rol}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            <Input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
          </div>

          <Button onClick={save} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar perfil"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estadisticas personales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{profile.stats.creados}</p>
            <p className="text-sm text-muted-foreground">Tickets creados</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{profile.stats.asignados}</p>
            <p className="text-sm text-muted-foreground">Tickets asignados</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{profile.stats.resueltos}</p>
            <p className="text-sm text-muted-foreground">Tickets resueltos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
