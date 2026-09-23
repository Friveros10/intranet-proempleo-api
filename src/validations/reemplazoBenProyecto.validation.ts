import { z } from 'zod';

const nuevoBeneficiarioSchema = z.object({
  rut: z.string({ required_error: 'El RUT del nuevo beneficiario es requerido' }).min(2),
  nombres: z.string({ required_error: 'Los nombres son requeridos' }).min(1),
  apellidoPaterno: z.string({ required_error: 'El apellido paterno es requerido' }).min(1),
  apellidoMaterno: z.string({ required_error: 'El apellido materno es requerido' }).min(1),
  direccion: z.string().trim().min(1).nullable().optional(),
  fechaNacimiento: z.string({ required_error: 'La fecha de nacimiento es requerida' }).min(1),
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
    idBeneficiarioProyecto: z.coerce.number({ required_error: 'idBeneficiarioProyecto es requerido' }).int(),
    idProyecto: z.coerce.number({ required_error: 'idProyecto es requerido' }).int(),
    nuevoBeneficiario: jsonField(nuevoBeneficiarioSchema, 'nuevoBeneficiario inválido'),
    idsDocumentos: jsonField(z.array(z.coerce.number().int()), 'idsDocumentos inválido'),
  }),
});

export const actualizarEstadoReemplazoSchema = z.object({
  body: z.object({
    status: z.enum(['aprobado', 'rechazado'], { required_error: 'status es requerido' }),
    comentarioRechazo: z
      .string()
      .trim()
      .max(1000, 'El comentario no puede superar 1000 caracteres')
      .optional(),
  }).superRefine((data, ctx) => {
    if (data.status === 'rechazado' && (!data.comentarioRechazo || !data.comentarioRechazo.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comentarioRechazo'],
        message: 'El comentario es requerido al rechazar una solicitud',
      });
    }
  }),
});

export const listarReemplazoSchema = z.object({
  query: z.object({
    region: z.coerce.number().int().optional(),
    fechaDesde: z.string().min(1).optional(),
    fechaHasta: z.string().min(1).optional(),
    status: z.enum(['pendiente', 'aprobado', 'rechazado']).optional(),
  }),
});

export type ListarReemplazoQuery = z.infer<typeof listarReemplazoSchema>['query'];

export type CrearReemplazoInput = z.infer<typeof crearReemplazoSchema>['body'];
export type ActualizarEstadoReemplazoInput = z.infer<typeof actualizarEstadoReemplazoSchema>['body'];
