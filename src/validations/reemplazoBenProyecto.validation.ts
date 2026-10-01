import { z } from "zod";
import {
  CRITERIO_VALOR_MAX,
  CRITERIO_VALOR_MIN,
} from "../constants/checklist.constants";

const nuevoBeneficiarioSchema = z.object({
  rut: z
    .string({ required_error: "El RUT del nuevo beneficiario es requerido" })
    .min(2),
  nombres: z.string({ required_error: "Los nombres son requeridos" }).min(1),
  apellidoPaterno: z
    .string({ required_error: "El apellido paterno es requerido" })
    .min(1),
  apellidoMaterno: z
    .string({ required_error: "El apellido materno es requerido" })
    .min(1),
  direccion: z.string().trim().min(1).nullable().optional(),
  fechaNacimiento: z
    .string({ required_error: "La fecha de nacimiento es requerida" })
    .min(1),
  genero: z.string().optional(),
  etnia: z.string().nullable().optional(),
  educacion: z.string().optional(),
});

// La solicitud llega como multipart/form-data (incluye los PDF adjuntos), por lo
// que los campos anidados viajan como JSON serializado dentro de strings.
function jsonField<T extends z.ZodTypeAny>(schema: T, mensajeInvalido: string) {
  return z
    .string()
    .transform((valor, ctx) => {
      try {
        return JSON.parse(valor);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensajeInvalido });
        return z.NEVER;
      }
    })
    .pipe(schema);
}

export const crearReemplazoSchema = z.object({
  body: z.object({
    idBeneficiarioProyecto: z.coerce
      .number({ required_error: "idBeneficiarioProyecto es requerido" })
      .int(),
    idProyecto: z.coerce
      .number({ required_error: "idProyecto es requerido" })
      .int(),
    nuevosBeneficiarios: jsonField(
      z
        .array(nuevoBeneficiarioSchema)
        .length(3, "Se deben ingresar exactamente tres beneficiarios nuevos"),
      "nuevosBeneficiarios inválido",
    ),
    documentos: jsonField(
      z.array(
        z.object({
          rut: z.string().min(2),
          idDocumento: z.coerce.number().int(),
        }),
      ),
      "documentos inválido",
    ),
  }),
});

export const actualizarEstadoReemplazoSchema = z.object({
  body: z
    .object({
      status: z.enum(["aprobado", "rechazado", "enRevision", "revisado"], {
        required_error: "status es requerido",
      }),
      comentarioRechazo: z
        .string()
        .trim()
        .max(1000, "El comentario no puede superar 1000 caracteres")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.status === "rechazado" &&
        (!data.comentarioRechazo || !data.comentarioRechazo.trim())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["comentarioRechazo"],
          message: "El comentario es requerido al rechazar una solicitud",
        });
      }
    }),
});

const criterioSchema = z
  .number({
    required_error: "El criterio es requerido",
    invalid_type_error: "El criterio debe ser numérico",
  })
  .int("El criterio debe ser un número entero")
  .min(
    CRITERIO_VALOR_MIN,
    `El criterio debe ser mayor o igual a ${CRITERIO_VALOR_MIN}`,
  )
  .max(
    CRITERIO_VALOR_MAX,
    `El criterio debe ser menor o igual a ${CRITERIO_VALOR_MAX}`,
  );

const checklistCandidatoSchema = z.object({
  id: z
    .number({ required_error: "El id del Reemplazo de Cupo es requerido" })
    .int()
    .positive(),
  criterio_1: criterioSchema,
  criterio_2: criterioSchema,
  criterio_3: criterioSchema,
  criterio_4: criterioSchema,
  criterio_5: criterioSchema,
});

export const actualizarChecklistReemplazoSchema = z.object({
  body: z.object({
    candidatos: z
      .array(checklistCandidatoSchema)
      .min(1, "Debe evaluar al menos un candidato")
      .refine(
        (candidatos) =>
          new Set(candidatos.map((c) => c.id)).size === candidatos.length,
        {
          message: "Los candidatos no pueden repetirse",
        },
      ),
  }),
});

export const listarReemplazoSchema = z.object({
  query: z.object({
    region: z.coerce.number().int().optional(),
    comuna: z.coerce.number().int().optional(),
    fechaDesde: z.string().min(1).optional(),
    fechaHasta: z.string().min(1).optional(),
    status: z
      .enum(["pendiente", "aprobado", "rechazado", "enRevision", "revisado"])
      .optional(),
  }),
});

export const listarComunasReemplazoSchema = z.object({
  query: z.object({
    region: z.coerce.number().int().optional(),
  }),
});

export type ListarReemplazoQuery = z.infer<
  typeof listarReemplazoSchema
>["query"];

export type CrearReemplazoInput = z.infer<typeof crearReemplazoSchema>["body"];
export type ActualizarEstadoReemplazoInput = z.infer<
  typeof actualizarEstadoReemplazoSchema
>["body"];
export type ActualizarChecklistReemplazoInput = z.infer<
  typeof actualizarChecklistReemplazoSchema
>["body"];
