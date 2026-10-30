import { z } from 'zod';

const id = z.coerce.number().int().positive().max(2147483647);
const rut = z.string().trim().regex(
  /^(?:\d{7,9}|\d{1,3}(?:\.\d{3})+)-[\dkK]$/,
  'El RUT debe tener formato 12345678-5 o 12.345.678-5',
);
const texto = (max: number) => z.string().trim().min(1).max(max);
const opcional = (max: number) => z.string().trim().max(max).nullable().default(null);

export const listarEjecutoresSchema = z.object({
  query: z.object({
    rut: z.coerce.number().int().positive().max(2147483647).optional(),
    region: id.optional(),
    comuna: id.optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerEjecutorSchema = z.object({
  params: z.object({ rut: id }),
  query: z.object({ origen: z.enum(['legacy', 'proempleo']).default('legacy') }).default({}),
});

export const guardarEjecutorSchema = z.object({
  body: z.object({
    rut,
    nom_eje: texto(150),
    dir_eje: opcional(150),
    reg_eje: id,
    ciu_eje: id,
    com_eje: id,
    tel_eje: z.string().trim().regex(/^\d{1,10}$/, 'El teléfono debe ser numérico de hasta 10 dígitos').nullable().default(null),
    rut_res: z.number().int().positive().max(2147483647).nullable().default(null),
  }).strict(),
});

export type ListarEjecutoresQuery = z.infer<typeof listarEjecutoresSchema>['query'];
export type GuardarEjecutorInput = z.infer<typeof guardarEjecutorSchema>['body'];
