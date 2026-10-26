import { z } from 'zod';

export const listarDecretosHaciendaSchema = z.object({
  query: z.object({
    anio: z.coerce.number().int().min(1900).max(9998).optional(),
    folio: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerDecretoHaciendaSchema = z.object({
  params: z.object({ folio: z.string().trim().min(1).max(150) }),
  query: z.object({ origen: z.enum(['legacy', 'proempleo']).default('legacy') }).default({}),
});

export type ListarDecretosHaciendaQuery = z.infer<typeof listarDecretosHaciendaSchema>['query'];

const monto = z.string().regex(/^\d{1,18}$/, 'El monto debe ser un entero no negativo de hasta 18 dígitos');
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' && value <= '9998-12-31';
}, 'Fecha inválida');

export const guardarDecretoHaciendaSchema = z.object({
  body: z.object({
    fol_dechac: z.string().trim().min(1).max(50).regex(/^[^/\\?#\u0000-\u001f]+$/, 'Folio inválido'),
    fec_dechac: fecha,
    mon_dechac: monto,
    obs_dechac: z.string().trim().max(200).nullable(),
    detalles: z.array(z.object({
      corr_dethac: z.number().int().positive().max(2147483647).optional(),
      corr_mar: z.number().int().positive().max(2147483647),
      origen_mar: z.enum(['legacy', 'proempleo']),
      glosa_dethac: z.enum(['GASTOS DE ADM Y PERSONAL', 'EJECUCION']),
      acc_dethac: z.enum(['Suma', 'Resta', 'Igual']),
      mon_dethac: monto,
    }).strict()).min(1).max(100),
  }).strict().superRefine((data, ctx) => {
    const ids = data.detalles.flatMap((detalle) => detalle.corr_dethac === undefined ? [] : [detalle.corr_dethac]);
    if (new Set(ids).size !== ids.length) ctx.addIssue({
      code: z.ZodIssueCode.custom, path: ['detalles'], message: 'No se pueden repetir identificadores de detalle',
    });
  }),
});

export type GuardarDecretoHaciendaInput = z.infer<typeof guardarDecretoHaciendaSchema>['body'];
