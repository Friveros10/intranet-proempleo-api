import { z } from 'zod';

export const TIPOS_CONDOC = ['Archivador', 'caja Memphis', 'Sobre sellado'] as const;
export const ESTADOS_CONDOC = ['Gestion', 'Archivado', 'Enviado'] as const;

const id = z.coerce.number().int().positive().max(2147483647);
const anio = z.coerce.number().int().min(1900).max(9998);

export const listarCondocSchema = z.object({
  query: z.object({
    anio: anio.optional(),
    folio: z.string().trim().max(50).optional(),
    area: id.optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerCondocSchema = z.object({
  params: z.object({ id }),
  query: z.object({ origen: z.enum(['legacy', 'proempleo']).default('legacy') }).default({}),
});

export const programasCondocSchema = z.object({
  query: z.object({ anio }),
});

export const cambiarEstadoCondocSchema = z.object({
  params: z.object({ id }),
});

export const guardarCondocSchema = z.object({
  body: z.object({
    cod_ano: z.number().int().min(1900).max(9998),
    corr_mar: z.number().int().positive().max(2147483647),
    tip_condoc: z.enum(TIPOS_CONDOC),
    cod_are: z.number().int().positive().max(2147483647),
    des_condoc: z.string().trim().min(1).max(250),
    ant_condoc: z.string().trim().max(250).nullable().default(null),
  }).strict(),
});

export type ListarCondocQuery = z.infer<typeof listarCondocSchema>['query'];
export type GuardarCondocInput = z.infer<typeof guardarCondocSchema>['body'];
