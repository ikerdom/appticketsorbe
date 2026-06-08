import { prisma } from "@/lib/prisma";
import { requireCurrentPageUser } from "@/lib/data";
import { ProfileView } from "@/components/tickets/profile-view";

export default async function PerfilPage() {
  const user = await requireCurrentPageUser();

  const [creados, asignados, resueltos] = await Promise.all([
    prisma.ticket.count({ where: { creadorId: user.id } }),
    prisma.ticket.count({ where: { asignadoId: user.id } }),
    prisma.ticket.count({ where: { asignadoId: user.id, estado: "RESUELTO" } })
  ]);

  return (
    <ProfileView
      profile={{
        email: user.email,
        nombre: user.nombre ?? user.name,
        empresa: user.empresa.nombre,
        rol: user.rol,
        image: user.image,
        stats: { creados, asignados, resueltos }
      }}
    />
  );
}
