"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectEmpresaFromDomain, isAllowedDomain, isEmailFormat, parseEmailDomain } from "@/lib/auth-email";

const DOMINIOS_TEXT = [
  "Editorial CEP: @editorialcep.com",
  "Entenova: @entenova.com",
  "ORBE: @orbe.es",
  "Veprix: @veprix.com"
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestDone, setRequestDone] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const domain = parseEmailDomain(normalizedEmail);
  const domainAllowed = !normalizedEmail || isAllowedDomain(domain);
  const companyByDomain = domain ? detectEmpresaFromDomain(domain) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid_session") {
      setError("Tu sesión ha expirado. Vuelve a iniciar sesión.");
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
    setShowRequest(false);

    if (!isEmailFormat(normalizedEmail)) {
      setError("Introduce un email válido.");
      return;
    }
    if (!domainAllowed) {
      setError("Este correo no pertenece a una empresa del grupo. Pide alta al administrador.");
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
            if (response.status === 423) {
              setError("Cuenta desactivada. Contacta con un administrador.");
              return;
            }
            setError("No tienes acceso a esta aplicación.");
            if (domainAllowed) setShowRequest(true);
            return;
          }
          router.push(data.redirect || "/");
          router.refresh();
          return;
        }

        setNeedsPassword(true);
        return;
      }

      const { response, data } = await requestLogin({ email: normalizedEmail, password });
      if (!response.ok || !data.ok) {
        if (response.status === 423) {
          setError("Cuenta desactivada. Contacta con un administrador.");
          return;
        }
        setError("Credenciales incorrectas.");
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
                    Cambiar
                  </Button>
                ) : null}
              </div>
              {!domainAllowed ? (
                <p className="text-xs text-red-600">Este correo no pertenece a una empresa del grupo. Pide alta al administrador.</p>
              ) : null}
            </div>

            <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-700">
              <p className="mb-1 font-medium">Dominios corporativos aceptados:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {DOMINIOS_TEXT.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2">Se admiten también dominios legacy del grupo.</p>
            </div>

            {needsPassword ? (
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
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
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading || !domainAllowed}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <Link className="text-blue-700 underline" href="/recuperar">
                ¿Olvidaste tu contraseña?
              </Link>
              {showRequest ? (
                <button type="button" className="text-blue-700 underline" onClick={() => setShowRequest(true)}>
                  Solicitar alta
                </button>
              ) : null}
            </div>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">¿Problemas para acceder? Contacta con Iker.</p>
        </CardContent>
      </Card>

      {showRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRequest(false)}>
          <div className="w-full max-w-md rounded-xl border bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Solicitar alta</h3>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border" onClick={() => setShowRequest(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            {requestDone ? (
              <p className="text-sm text-emerald-700">Solicitud enviada. Un administrador la revisará.</p>
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const response = await fetch("/api/auth/signup-request", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre: requestName, email: normalizedEmail, empresaNombre: companyByDomain })
                  });
                  if (!response.ok) {
                    setError("No se pudo registrar la solicitud.");
                    return;
                  }
                  setRequestDone(true);
                }}
              >
                <Input value={requestName} onChange={(event) => setRequestName(event.target.value)} placeholder="Tu nombre" required />
                <Input value={normalizedEmail} readOnly />
                <Input value={companyByDomain || "Empresa no detectada"} readOnly />
                <Button className="w-full" type="submit" disabled={!requestName.trim()}>
                  Enviar solicitud
                </Button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
