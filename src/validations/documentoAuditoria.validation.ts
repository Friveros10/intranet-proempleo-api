import { z } from 'zod';

const id = z.coerce.number().int().positive();
const tipo = z.enum(['certCotizaciones', 'liquidacion']);
const texto = z.string().trim().min(1, 'Campo requerido').max(255);

export const crearDocumentoAuditoriaSchema = z.object({
  body: z.object({
    rut: z.string().trim().regex(/^(?:[1-9]\d?(?:\.\d{3}){2}|[1-9]\d{0,7})-?[\dkK]$/, 'RUT inválido'),
    nombres: texto,
    apellidoPaterno: texto,
    apellidoMaterno: texto,
    ong: texto,
    comuna: texto,
  }).strict(),
});

export const listarDocumentoAuditoriaSchema = z.object({
  query: z.object({
    region: id.optional(),
    ong: texto.optional(),
    rut: z.string().trim().max(12)
      .transform((value) => value.replace(/\./g, '').toUpperCase())
      .pipe(z.string().regex(/^[1-9]\d{0,7}(?:-[\dK])?$/, 'RUT inválido'))
      .optional(),
    page: id.max(Math.floor(2147483647 / 50) + 1).default(1),
  }),
});

export const documentoAuditoriaParamsSchema = z.object({
  params: z.object({ id, tipo, filename: z.string().optional() }),
});

export const guardarDocumentosAuditoriaSchema = z.object({
  params: z.object({ id }),
  body: z.object({}).strict(),
});

export const estadoDocumentoAuditoriaSchema = documentoAuditoriaParamsSchema.extend({
  body: z.object({
    status: z.enum(['aprobado', 'rechazado']),
    comentario: z.string().trim().max(1000).optional(),
  }).superRefine((data, ctx) => {
    if (data.status === 'rechazado' && !data.comentario) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ['comentario'],
        message: 'El comentario es requerido al rechazar un documento',
      });
    }
  }),
});

export const estadoUploadDocumentoAuditoriaSchema = documentoAuditoriaParamsSchema.extend({
  body: z.object({ status: z.literal('subidos') }).strict(),
});

export type CrearDocumentoAuditoriaInput = z.infer<typeof crearDocumentoAuditoriaSchema>['body'];
export type EstadoDocumentoAuditoriaInput = z.infer<typeof estadoDocumentoAuditoriaSchema>['body'];
