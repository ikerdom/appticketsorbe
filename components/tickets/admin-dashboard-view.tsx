"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, BarChart3, BookOpen, Clock3, Download, Layers3, Timer, Zap, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTimeEs } from "@/lib/dates";
import { formatHoras } from "@/lib/ticket-timing";

interface MetricData {
  estado: { ABIERTO: number; EN_CURSO: number; RESUELTO: number };
  estadoPrev: { ABIERTO: number; EN_CURSO: number; RESUELTO: number };
  comparePct: { ABIERTO: number; EN_CURSO: number; RESUELTO: number };
  origen: { nombre: string; total: number }[];
  destino: { nombre: string; total: number }[];
  prioridad: { prioridad: string; total: number }[];
  trend: { fecha: string; creados: number; resueltos: number }[];
  topCategorias: { categoria: string; total: number }[];
  sinAsignar: {
    id: string;
    numero: number;
    titulo: string;
    createdAt: string;
    empresaDestino: string;
  }[];
  avgGlobalHoras: number;
  avgPorEmpresa: { empresa: string; horas: number }[];
  exportQuery: string;
  empresas: { id: string; nombre: string }[];
  range: 30 | 90;
  timingStats?: {
    avgRespuestaHoras: number | null;
    avgResolucionHoras: number | null;
    slaOkPct: number | null;
    slaBreachCount: number;
    conSolucionCount: number;
    conSolucionPct: number;
  };
}

const PRIORIDAD_COLORS: Record<string, string> = {
  CRITICA: "#dc2626",
  ALTA: "#f97316",
  MEDIA: "#f59e0b",
  BAJA: "#64748b"
};

function EmptyChart({ message }: { message: string }) {
  return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">{message}</p>;
}

export function AdminDashboardView({ data }: { data: MetricData }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3">
        <div className="text-sm text-muted-foreground">Comparativa vs periodo anterior ({data.range} días)</div>
        <div className="flex items-center gap-2">
          <Link href={`?range=30`} className={`rounded-md border px-3 py-1.5 text-xs ${data.range === 30 ? "bg-primary text-primary-foreground" : ""}`}>30 días</Link>
          <Link href={`?range=90`} className={`rounded-md border px-3 py-1.5 text-xs ${data.range === 90 ? "bg-primary text-primary-foreground" : ""}`}>90 días</Link>
          <a href={`/api/admin/export?${data.exportQuery}`}>
            <Button size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-blue-600" />Abiertos</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-blue-600">{data.estado.ABIERTO}</p><p className="text-xs text-muted-foreground">{data.comparePct.ABIERTO >= 0 ? "+" : ""}{data.comparePct.ABIERTO}% vs periodo previo</p></CardContent></Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-amber-600" />En curso</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-amber-600">{data.estado.EN_CURSO}</p><p className="text-xs text-muted-foreground">{data.comparePct.EN_CURSO >= 0 ? "+" : ""}{data.comparePct.EN_CURSO}% vs periodo previo</p></CardContent></Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-600" />Resueltos</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-emerald-600">{data.estado.RESUELTO}</p><p className="text-xs text-muted-foreground">{data.comparePct.RESUELTO >= 0 ? "+" : ""}{data.comparePct.RESUELTO}% vs periodo previo</p></CardContent></Card>
      </div>

      {/* Timing stats */}
      {data.timingStats && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tiempos · SLA</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-amber-500" />1ª respuesta media</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{formatHoras(data.timingStats.avgRespuestaHoras)}</p>
                <p className="text-xs text-muted-foreground">Tiempo hasta primer EN_CURSO</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4 text-indigo-500" />Resolución media</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-600">{formatHoras(data.timingStats.avgResolucionHoras)}</p>
                <p className="text-xs text-muted-foreground">Apertura → resolución</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-emerald-500" />SLA cumplido</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">
                  {data.timingStats.slaOkPct !== null ? `${Math.round(data.timingStats.slaOkPct)}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Resueltos en &lt;72h · {data.timingStats.slaBreachCount} incumplidos</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="rounded-2xl border-emerald-100 bg-emerald-50/40">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4 text-emerald-600" />Soluciones documentadas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-700">{data.timingStats.conSolucionCount} <span className="text-base font-medium text-emerald-500">({data.timingStats.conSolucionPct}%)</span></p>
                <p className="text-xs text-muted-foreground">Tickets resueltos con "cómo se resolvió" escrito · Base de conocimiento</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-red-100 bg-red-50/40">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-red-500" />Sin documentar</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{data.estado.RESUELTO - data.timingStats.conSolucionCount} <span className="text-base font-medium text-red-400">({100 - data.timingStats.conSolucionPct}%)</span></p>
                <p className="text-xs text-muted-foreground">Resueltos sin nota de resolución · Anima al equipo a documentar</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Tickets por empresa origen</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.origen.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.origen}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Tickets por empresa afectada</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.destino.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.destino}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Distribución por prioridad</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.prioridad.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.prioridad} dataKey="total" nameKey="prioridad" cx="50%" cy="50%" outerRadius={90} label>
                    {data.prioridad.map((item) => (
                      <Cell key={item.prioridad} fill={PRIORIDAD_COLORS[item.prioridad] || "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Evolución temporal ({data.range} días) · creados vs resueltos</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.trend.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area dataKey="creados" name="Creados" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                  <Area dataKey="resueltos" name="Resueltos" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Top 5 categorías</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.topCategorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay tickets en este periodo.</p>
            ) : (
              data.topCategorias.map((item) => (
                <div key={item.categoria}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.categoria}</span>
                    <span>{item.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-700" style={{ width: `${Math.max(8, item.total * 10)}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Tiempo medio de resolución por empresa (h)</CardTitle>
            <p className="text-xs text-muted-foreground">Global: {data.avgGlobalHoras.toFixed(1)}h · Referencia SLA: 72h</p>
          </CardHeader>
          <CardContent className="h-64">
            {data.avgPorEmpresa.length === 0 ? (
              <EmptyChart message="Sin datos de resolución en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.avgPorEmpresa} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} unit="h" />
                  <YAxis type="category" dataKey="empresa" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}h`, "Resolución media"]} />
                  <Bar dataKey="horas" name="Horas" radius={[0, 4, 4, 0]}>
                    {data.avgPorEmpresa.map((item) => (
                      <Cell key={item.empresa} fill={item.horas > 72 ? "#dc2626" : item.horas > 48 ? "#f97316" : "#16a34a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-600" />Tickets sin asignar &gt; 48h</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.sinAsignar.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay tickets sin asignar de más de 48h.</p>
          ) : (
            data.sinAsignar.map((ticket) => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 hover:bg-red-100">
                #{String(ticket.numero).padStart(3, "0")} · {ticket.titulo} · {ticket.empresaDestino} · {formatDateTimeEs(ticket.createdAt)}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

