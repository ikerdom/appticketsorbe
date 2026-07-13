"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PRIORIDAD_COLORS: Record<string, string> = {
  CRITICA: "#dc2626",
  ALTA: "#f97316",
  MEDIA: "#f59e0b",
  BAJA: "#64748b"
};

function EmptyChart({ message }: { message: string }) {
  return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">{message}</p>;
}

interface AdminChartsProps {
  origen: { nombre: string; total: number }[];
  destino: { nombre: string; total: number }[];
  prioridad: { prioridad: string; total: number }[];
  trend: { fecha: string; creados: number; resueltos: number }[];
  avgPorEmpresa: { empresa: string; horas: number }[];
  avgGlobalHoras: number;
  range: 30 | 90;
}

/**
 * Todos los gráficos recharts del dashboard admin, cargados vía next/dynamic
 * con ssr:false desde admin-dashboard-view.tsx — recharts pesa ~100kB y solo
 * lo necesita esta ruta, así el resto del dashboard pinta sin esperarlo.
 */
export function AdminCharts({ origen, destino, prioridad, trend, avgPorEmpresa, avgGlobalHoras, range }: AdminChartsProps) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Tickets por empresa origen</CardTitle></CardHeader>
          <CardContent className="h-72">
            {origen.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={origen}>
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
            {destino.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destino}>
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
            {prioridad.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={prioridad} dataKey="total" nameKey="prioridad" cx="50%" cy="50%" outerRadius={90} label>
                    {prioridad.map((item) => (
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
          <CardHeader><CardTitle>Evolución temporal ({range} días) · creados vs resueltos</CardTitle></CardHeader>
          <CardContent className="h-72">
            {trend.length === 0 ? (
              <EmptyChart message="Aún no hay tickets en este periodo." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
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

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Tiempo medio de resolución por empresa (h)</CardTitle>
          <p className="text-xs text-muted-foreground">Global: {avgGlobalHoras.toFixed(1)}h · Referencia SLA: 72h</p>
        </CardHeader>
        <CardContent className="h-64">
          {avgPorEmpresa.length === 0 ? (
            <EmptyChart message="Sin datos de resolución en este periodo." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgPorEmpresa} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} unit="h" />
                <YAxis type="category" dataKey="empresa" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}h`, "Resolución media"]} />
                <Bar dataKey="horas" name="Horas" radius={[0, 4, 4, 0]}>
                  {avgPorEmpresa.map((item) => (
                    <Cell key={item.empresa} fill={item.horas > 72 ? "#dc2626" : item.horas > 48 ? "#f97316" : "#16a34a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}
