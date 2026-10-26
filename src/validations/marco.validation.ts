import { z } from 'zod';

export const listarMarcosSchema = z.object({
  query: z.object({
    anio: z.coerce.number().int().min(1900).max(9999).optional(),
    buscar: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerMarcoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive().max(2147483647) }),
  query: z.object({ origen: z.enum(['legacy', 'proempleo']).default('legacy') }),
});

export type ListarMarcosQuery = z.infer<typeof listarMarcosSchema>['query'];
export type OrigenMarco = 'legacy' | 'proempleo';

const entero = z.number().int().min(0).max(2147483647);
const monto = z.string().regex(/^\d{1,18}$/, 'El monto debe ser un entero no negativo de hasta 18 dígitos');
const detalle = z.object({
  corr_detmar: z.number().int().positive().max(2147483647).optional(),
  glo_detmar: entero,
  nom_detmar: z.string().trim().min(1).max(250),
  acc_detmar: z.enum(['Resta', 'Suma']),
  mon_detmar: monto,
}).strict();

export const guardarMarcoSchema = z.object({
  body: z.object({
    ano_mar: z.number().int().min(1900).max(9999),
    subtitulo_mar: entero,
    item_mar: entero,
    linea_mar: entero,
    nombre_mar: z.string().trim().min(1).max(250),
    monto_mar: monto,
    est_mar: z.string().trim().max(50).nullable(),
    ema_mar: z.union([z.literal(''), z.string().trim().email().max(50)]).nullable(),
    tip_mar: z.string().trim().max(15).nullable(),
    detalles: z.array(detalle).min(1).max(100),
  }).strict().superRefine((data, ctx) => {
    const codigos = data.detalles.map((item) => item.glo_detmar);
    const ids = data.detalles.flatMap((item) => item.corr_detmar === undefined ? [] : [item.corr_detmar]);
    if (new Set(codigos).size !== codigos.length || new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['detalles'], message: 'No se pueden repetir códigos ni identificadores de glosa' });
    }
  }),
});

export type GuardarMarcoInput = z.infer<typeof guardarMarcoSchema>['body'];
