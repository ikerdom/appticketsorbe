import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { PropuestasList } from "@/components/propuestas/propuestas-list";

export const metadata: Metadata = {
  title: "Propuestas de mejora · Incidencia"
};

export default async function PropuestasPage() {
  const user = await requireCurrentPageUser();

  const propuestas = await prisma.propuesta.findMany({
    where: { userId: user.id },
    include: {
      empresa: { select: { id: true, nombre: true, color: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const autorNombre = user.nombre ?? user.name ?? user.email ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Propuestas de mejora</h1>
        <p className="text-sm text-slate-500">Tus ideas y sugerencias para mejorar la plataforma</p>
      </div>
      <PropuestasList
        initialPropuestas={propuestas}
        defaultAutorNombre={autorNombre}
        defaultAutorEmail={user.email ?? ""}
      />
    </div>
  );
}
