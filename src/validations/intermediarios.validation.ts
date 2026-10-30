import { z } from 'zod';

const id = z.coerce.number().int().positive().max(2147483647);
const rut = z.string().trim().regex(
  /^(?:\d{7,9}|\d{1,3}(?:\.\d{3})+)-[\dkK]$/,
  'El RUT debe tener formato 12345678-5 o 12.345.678-5',
);
const texto = (max: number) => z.string().trim().min(1).max(max);
const opcional = (max: number) => z.string().trim().max(max).nullable().default(null);
const email = (max: number) => z.string().trim().max(max)
  .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Email inválido')
  .nullable().default(null);

export const listarIntermediariosSchema = z.object({
  query: z.object({
    rut: z.coerce.number().int().positive().max(2147483647).optional(),
    region: id.optional(),
    comuna: id.optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerIntermediarioSchema = z.object({
  params: z.object({ rut: id }),
  query: z.object({ origen: z.enum(['legacy', 'proempleo']).default('legacy') }).default({}),
});

export const ciudadesSchema = z.object({ query: z.object({ region: id }) });

export const comunasSchema = z.object({
  query: z.object({ region: id.optional(), ciudad: id.optional() })
    .refine((q) => q.region !== undefined || q.ciudad !== undefined, 'Debes indicar región o ciudad'),
});

export const responsablesPorComunaSchema = z.object({ query: z.object({ comuna: id }) });

export const guardarResponsableSchema = z.object({
  body: z.object({
    rut,
    nom_res: texto(50),
    car_res: opcional(50),
    ema_res: email(60),
    fax_res: opcional(50),
    tel_res: opcional(50),
    reg_res: id,
    ciu_res: id,
    com_res: id,
  }).strict(),
});

export const guardarIntermediarioSchema = z.object({
  body: z.object({
    rut,
    nom_int: texto(150),
    dir_int: opcional(150),
    reg_int: id,
    ciu_int: id,
    com_int: id,
    tel_int: z.string().trim().regex(/^\d{1,10}$/, 'El teléfono debe ser numérico de hasta 10 dígitos').nullable().default(null),
    ema_int: email(50),
    int_int: z.boolean().default(false),
    rut_res: z.number().int().positive().max(2147483647).nullable().default(null),
  }).strict(),
});

export type ListarIntermediariosQuery = z.infer<typeof listarIntermediariosSchema>['query'];
export type GuardarIntermediarioInput = z.infer<typeof guardarIntermediarioSchema>['body'];
export type GuardarResponsableInput = z.infer<typeof guardarResponsableSchema>['body'];
