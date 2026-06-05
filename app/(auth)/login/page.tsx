"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, EyeOff, Loader2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectEmpresaFromDomain, isAllowedDomain, isEmailFormat, parseEmailDomain } from "@/lib/auth-email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "existing_password" | "set_password">("email");
  const [showRequest, setShowRequest] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestDone, setRequestDone] = useState(false);
  const [showContact, setShowContact] = useState(false);

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
    if (loading) return step === "email" ? "Continuando..." : "Entrando...";
    if (step === "set_password") return "Crear cuenta y entrar";
    return step === "existing_password" ? "Entrar" : "Continuar";
  }, [loading, step]);

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
      if (step === "email") {
        const checkResponse = await fetch("/api/auth/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail })
        });
        const checkData = await checkResponse.json().catch(() => ({ status: "unknown" }));

        if (checkData.status === "has_password") {
          setStep("existing_password");
        } else if (checkData.status === "set_password") {
          setStep("set_password");
        } else {
          setError("Este correo no tiene acceso. Contacta con el administrador.");
        }
        return;
      }

      if (!password || password.length < 4) {
        setError("La contraseña debe tener al menos 4 caracteres.");
        return;
      }

      const { response, data } = await requestLogin({ email: normalizedEmail, password });
      if (!response.ok || !data.ok) {
        if (response.status === 423) {
          setError("Cuenta desactivada. Contacta con un administrador.");
          return;
        }
        setError(data.message || (step === "existing_password" ? "Contraseña incorrecta." : "No se pudo crear la cuenta."));
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") ?? "";
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.push(safeNext || data.redirect || "/");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/5 blur-2xl" />

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 shadow-xl shadow-indigo-500/30">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Tickets</h1>
          <p className="mt-1.5 text-sm text-slate-400">Plataforma de gestión de tickets del grupo</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-800 px-2.5 py-1">EnteNova</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1">Veprix</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1">ORBE</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1">CEP</span>
          </div>
        </div>

        <Card className="border-slate-700/60 bg-white shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-slate-900">Iniciar sesión</CardTitle>
            <CardDescription>Accede con tu correo corporativo</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email corporativo</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    autoComplete="email"
                    autoFocus
                    readOnly={step !== "email"}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  {step !== "email" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep("email");
                        setPassword("");
                        setError(null);
                      }}
                    >
                      Cambiar
                    </Button>
                  ) : null}
                </div>
                {!domainAllowed ? (
                  <p className="text-xs text-red-600">Correo no pertenece al grupo. Pide alta al administrador.</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setShowContact((v) => !v)}
                >
                  <span className="font-medium text-slate-700">Aplicación reservada para empresas del grupo</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showContact ? "rotate-180" : ""}`} />
                </button>
                {showContact ? (
                  <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                    <p className="text-slate-500">¿Necesitas acceso? Contacta con el administrador:</p>
                    <a href="tel:677117320" className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline">
                      677 11 73 20
                    </a>
                    <a href="mailto:iker.dominguez@entenova-gnosis.com" className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline">
                      iker.dominguez@entenova-gnosis.com
                    </a>
                  </div>
                ) : null}
              </div>

              {step === "set_password" ? (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3.5 py-3 text-sm text-indigo-800">
                  <p className="font-semibold">Primera vez aquí 👋</p>
                  <p className="mt-0.5 text-xs text-indigo-600">Elige una contraseña para tu cuenta (mínimo 4 caracteres).</p>
                </div>
              ) : null}

              {step !== "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    {step === "set_password" ? "Elige tu contraseña" : "Contraseña"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={step === "set_password" ? "new-password" : "current-password"}
                      autoFocus
                      minLength={4}
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

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading || !domainAllowed || (step !== "email" && password.length < 4)}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitLabel}
              </Button>

              <div className="flex items-center justify-between text-xs">
                {step === "existing_password" ? (
                  <Link className="text-indigo-600 hover:underline" href="/recuperar">
                    ¿Olvidaste tu contraseña?
                  </Link>
                ) : <span />}
                {showRequest ? (
                  <button type="button" className="text-indigo-600 hover:underline" onClick={() => setShowRequest(true)}>
                    Solicitar alta
                  </button>
                ) : null}
              </div>
            </form>

            <p className="mt-4 text-center text-xs text-slate-400">¿Problemas? Contacta con Iker.</p>
          </CardContent>
        </Card>
      </div>

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
