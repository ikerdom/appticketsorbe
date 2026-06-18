import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PublicTicketByNumeroPage({ params }: { params: { numero: string } }) {
  const num = parseInt(params.numero, 10);
  if (isNaN(num)) notFound();

  const ticket = await prisma.ticket.findUnique({
    where: { numero: num },
    select: { id: true }
  });

  if (!ticket) notFound();

  redirect(`/public/tickets/${ticket.id}`);
}
