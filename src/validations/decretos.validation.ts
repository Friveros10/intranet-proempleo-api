import { z } from 'zod';

export const listarDecretosSchema = z.object({
  query: z.object({
    anio: z.coerce.number().int().min(1900).max(9998).optional(),
    folio: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerDecretoSchema = z.object({
  params: z.object({ folio: z.string().trim().min(1).max(150) }),
  query: z.object({ origen: z.enum(['legacy', 'proempleo']).default('legacy') }).default({}),
});

export type ListarDecretosQuery = z.infer<typeof listarDecretosSchema>['query'];

export const programasIntermediario = [
  'Intendencia_InvC', 'Ejecutores_PSS', 'Ejecutores_PSS_CHS', 'Intendencia_Gore',
  'Artesanos_MEAT', 'Ejecutores_PROFES',
] as const;
export const coberturasDecreto = ['Regular', 'Administracion', 'Fueros'] as const;
const monto = z.string().regex(/^\d{1,18}$/, 'El monto debe ser un entero no negativo de hasta 18 dígitos');
const id = z.number().int().positive().max(2147483647);
export const glosasDecretoSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive().max(2147483647) }) });
export const guardarDecretoSchema = z.object({
  body: z.object({
    fol_dec: z.string().regex(/^A\d{2}[DRESP]\d{1,4}$/, 'Folio inválido'),
    folprov_dec: z.string().nullable(),
    ano_dec: z.number().int().min(1900).max(9998),
    fec_dec: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value &&
        value >= '1900-01-01' && value <= '9998-12-31';
    }, 'Fecha inválida'),
    obs_dec: z.string().trim().max(250).nullable(),
    mon_dec: monto,
    cob_dec: z.enum(coberturasDecreto),
    rutint_dec: id,
    programaInt: z.enum(programasIntermediario),
    detalles: z.array(z.object({
      corr_mar: id, corr_detmar: id, mon_decdet: monto,
      sublinea: z.enum(['DPR', 'GORE', 'GORE-CONV']),
    }).strict()).min(1).max(100),
  }).strict().superRefine((data, ctx) => {
    if ((data.fol_dec[3] === 'P' ? data.fol_dec : null) !== data.folprov_dec) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['folprov_dec'], message: 'El folio provisorio debe coincidir con el folio de tipo P' });
    }
  }),
});
export type GuardarDecretoInput = z.infer<typeof guardarDecretoSchema>['body'];
