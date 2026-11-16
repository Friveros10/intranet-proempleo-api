import { z } from 'zod';

export const dashboardSchema = z.object({
  query: z.object({
    anio: z.coerce.number().int().min(1900).max(3000),
    mes: z.coerce.number().int().min(1).max(12),
    region: z.coerce.number().int().positive().optional(),
    comuna: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export type DashboardQuery = z.infer<typeof dashboardSchema>['query'];
