"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      setNextPath(next);
    }
    if (params.get("error") === "invalid_session") {
      setError("Tu sesion ha expirado. Vuelve a iniciar sesion.");
    }
  }, []);

  const submitLabel = useMemo(() => {
    if (loading) return needsPassword ? "Entrando..." : "Continuando...";
    return needsPassword ? "Entrar" : "Continuar";
  }, [loading, needsPassword]);

  async function requestLogin(payload: { email: string; password?: string }) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({ ok: false, message: "Error de servidor." }));
    return { response, data };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmail(normalizedEmail)) {
      setError("Introduce un email valido.");
      return;
    }

    setLoading(true);

    try {
      if (!needsPassword) {
        const checkResponse = await fetch("/api/auth/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail })
        });
        const checkData = await checkResponse.json().catch(() => ({ needsPassword: false }));

        if (!checkData.needsPassword) {
          const { response, data } = await requestLogin({ email: normalizedEmail });
          if (!response.ok || !data.ok) {
            setError("No tienes acceso a esta aplicacion");
            return;
          }
          router.push(data.redirect || nextPath || "/");
          router.refresh();
          return;
        }

        setNeedsPassword(true);
        return;
      }

      const { response, data } = await requestLogin({ email: normalizedEmail, password });
      if (!response.ok || !data.ok) {
        setError("Credenciales incorrectas");
        return;
      }
      router.push(data.redirect || "/admin/dashboard");
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
          <CardTitle className="text-3xl font-semibold tracking-tight">Incidencia</CardTitle>
          <CardDescription>Sistema de tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  autoComplete="email"
                  autoFocus
                  readOnly={needsPassword}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {needsPassword ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNeedsPassword(false);
                      setPassword("");
                      setError(null);
                    }}
                  >
                    Cambiar email
                  </Button>
                ) : null}
              </div>
            </div>

            {needsPassword ? (
              <div className="space-y-1.5">
                <Label htmlFor="password">Contrasena</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">Problemas para acceder? Contacta con Iker</p>
        </CardContent>
      </Card>
    </main>
  );
}
