"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("next");
    if (value && value.startsWith("/") && !value.startsWith("//")) {
      setNextPath(value);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!actual || !nueva || !confirmar) {
      setError("Completa todos los campos.");
      return;
    }
    if (!isStrongPassword(nueva)) {
      setError("La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.");
      return;
    }
    if (nueva !== confirmar) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: actual, newPassword: nueva })
      });
      const payload = await response.json().catch(() => ({ ok: false, message: "Error interno." }));
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "No se pudo cambiar la contraseña.");
        return;
      }
      router.push(nextPath || "/");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Cambiar contraseña</CardTitle>
          <CardDescription>Debes actualizar tu contraseña para continuar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="actual">Contraseña actual</Label>
              <Input id="actual" type="password" value={actual} onChange={(event) => setActual(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nueva">Nueva contraseña</Label>
              <Input id="nueva" type="password" value={nueva} onChange={(event) => setNueva(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Repetir nueva contraseña</Label>
              <Input id="confirmar" type="password" value={confirmar} onChange={(event) => setConfirmar(event.target.value)} required />
            </div>

            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar contraseña"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
