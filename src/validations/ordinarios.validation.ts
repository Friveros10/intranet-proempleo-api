import { z } from 'zod';

export const folioOrdinario = z.string().trim().min(1).max(50);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((valor) => {
  const date = new Date(valor + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === valor && valor >= '1753-01-01';
}, 'Ingresa una fecha válida.');

export const listarOrdinariosSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    folio: z.string().trim().max(50).default(''),
  }),
});
export const obtenerOrdinarioSchema = z.object({ params: z.object({ ordinario: folioOrdinario }) });
export const crearOrdinarioSchema = z.object({
  body: z.object({
    ordinario: z.string().regex(/^A\d{2}O\d{4}$/, 'Usa el formato A00O0000.'),
    fecha_documento: fecha,
    fecha_pago: fecha,
  }).strict(),
});

export type ListarOrdinariosQuery = z.infer<typeof listarOrdinariosSchema>['query'];
export type CrearOrdinarioInput = z.infer<typeof crearOrdinarioSchema>['body'];
