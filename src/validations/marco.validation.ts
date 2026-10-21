import { z } from 'zod';

export const listarMarcosSchema = z.object({
  query: z.object({
    anio: z.coerce.number().int().min(1900).max(9999).optional(),
    buscar: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerMarcoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export type ListarMarcosQuery = z.infer<typeof listarMarcosSchema>['query'];
