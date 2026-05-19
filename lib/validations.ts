import { z } from "zod";

export const nuevoTicketSchema = z
  .object({
    titulo: z.string().min(3, "El título es obligatorio"),
    descripcion: z.string().min(10, "La descripción es obligatoria"),
    destinatarios: z.array(z.string().min(1)).min(1, "Selecciona al menos una empresa afectada"),
    personaAfectada: z.string().optional(),
    contactoNombre: z.string().min(2, "Nombre / recurso obligatorio"),
    contactoTelefono: z.string().optional(),
    contactoEmail: z.string().optional(),
    contactoReferencia: z.string().optional(),
    contactoNotas: z.string().optional(),
    prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
    categoria: z.enum(["TECNICO", "ADMINISTRATIVO", "COMERCIAL", "RRHH", "OTROS"]).optional(),
    categoriaCustom: z.string().optional(),
    asignadoId: z.string().optional().nullable()
  })
  .superRefine((data, ctx) => {
    const hasNombre = !!data.contactoNombre?.trim();
    if (!hasNombre) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactoNombre"], message: "Nombre / recurso obligatorio." });
    }
    const hasTel = !!data.contactoTelefono?.trim();
    const hasEmail = !!data.contactoEmail?.trim();

    if (hasEmail) {
      const parsed = z.string().email().safeParse(data.contactoEmail);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contactoEmail"],
          message: "El email de contacto no es válido."
        });
      }
    }

    if (hasTel) {
      const digits = (data.contactoTelefono ?? "").replace(/\D/g, "");
      if (digits.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contactoTelefono"],
          message: "El teléfono de contacto debe tener al menos 8 dígitos."
        });
      }
    }

    if (data.contactoReferencia?.trim()) {
      const ref = data.contactoReferencia.trim();
      if (/^https?:\/\//i.test(ref) || ref.includes(".")) {
        try {
          new URL(ref.startsWith("http") ? ref : `https://${ref}`);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["contactoReferencia"],
            message: "La URL o referencia no es válida."
          });
        }
      }
    }
  });

export const editarTicketSchema = z.object({
  titulo: z.string().min(3).optional(),
  descripcion: z.string().min(10).optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  categoria: z.enum(["TECNICO", "ADMINISTRATIVO", "COMERCIAL", "RRHH", "OTROS"]).optional(),
  categoriaCustom: z.string().optional(),
  asignadoId: z.string().optional().nullable(),
  personaAfectada: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoTelefono: z.string().optional(),
  contactoEmail: z.string().optional(),
  contactoReferencia: z.string().optional(),
  contactoNotas: z.string().optional(),
  destinatarios: z.array(z.string()).optional()
});

export const comentarioSchema = z.object({
  contenido: z.string().min(1, "El comentario no puede estar vacío")
});

export const estadoSchema = z.object({
  estado: z.enum(["ABIERTO", "EN_CURSO", "RESUELTO"])
});

export const filtroSchema = z.object({
  q: z.string().optional(),
  empresaOrigenId: z.string().optional(),
  empresaDestinoId: z.string().optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  categoria: z.string().optional(),
  asignadoId: z.string().optional(),
  vistaEmpresa: z.enum(["all", "mine"]).optional()
});
