import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { PropuestasAdminList } from "@/components/propuestas/propuestas-admin-list";

export const metadata: Metadata = {
  title: "Propuestas · Admin · Incidencia"
};

export default async function AdminPropuestasPage() {
  const user = await requireCurrentPageUser();
  if (user.rol !== "ADMIN") redirect("/propuestas");

  const propuestas = await prisma.propuesta.findMany({
    include: {
      empresa: { select: { id: true, nombre: true, color: true } },
      user: { select: { id: true, email: true, nombre: true, name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const pendientes = propuestas.filter(p => p.estado === "PENDIENTE").length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Propuestas de mejora</h1>
          <p className="text-sm text-slate-500">
            {propuestas.length} propuesta{propuestas.length !== 1 ? "s" : ""} en total
            {pendientes > 0 ? ` · ${pendientes} pendiente${pendientes !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>
      <PropuestasAdminList initialPropuestas={propuestas} />
    </div>
  );
}
