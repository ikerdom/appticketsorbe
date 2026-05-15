import { Ticket, Empresa, User, Comentario, Adjunto, TicketEmpresaDestino } from "@prisma/client";

type DestinoWithEmpresa = TicketEmpresaDestino & { empresa: Empresa };

export type TicketCardData = Ticket & {
  empresaOrigen: Empresa;
  empresaDestino: Empresa;
  destinos: DestinoWithEmpresa[];
  creador: Pick<User, "id" | "email" | "nombre" | "name">;
  asignado: Pick<User, "id" | "email" | "nombre" | "name" | "image"> | null;
  _count: { comentarios: number };
  unread?: boolean;
};

export type TicketDetailData = Ticket & {
  empresaOrigen: Empresa;
  empresaDestino: Empresa;
  destinos: DestinoWithEmpresa[];
  creador: Pick<User, "id" | "email" | "nombre" | "name">;
  asignado: Pick<User, "id" | "email" | "nombre" | "name" | "image"> | null;
  comentarios: (Comentario & {
    autor: Pick<User, "id" | "email" | "nombre" | "name">;
  })[];
  adjuntos: Adjunto[];
  historial: {
    id: string;
    accion: string;
    detalle: unknown;
    createdAt: Date;
    autor: Pick<User, "id" | "email" | "nombre" | "name"> | null;
  }[];
};
