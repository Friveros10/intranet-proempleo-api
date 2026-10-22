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
});

export type ListarDecretosQuery = z.infer<typeof listarDecretosSchema>['query'];
