import { z } from 'zod';

const id = z.coerce.number().int().positive().max(2147483647);
const decreto = z.string().trim().min(1).max(8).transform((value) => value.toUpperCase());
const periodo = { mes: z.coerce.number().int().min(1).max(12), anio: z.coerce.number().int().min(1900).max(9999) };

const datos = z.object({
  monto: z.string().regex(/^[1-9]\d{0,17}$/, 'Ingresa un monto positivo en pesos enteros.'),
  ordinario: z.string().trim().max(8).nullable().default(null),
}).strict();

export const listarReintegrosSchema = z.object({
  query: z.object({ decreto, ...periodo, page: id.default(1) }),
});
export const proyectoReintegroSchema = z.object({ query: z.object({ decreto, folio: id }) });
export const crearReintegroSchema = z.object({ body: datos.extend({ decreto, ...periodo, folio: id }) });
export const reintegroProempleoSchema = z.object({ params: z.object({ id }) });
export const editarReintegroSchema = reintegroProempleoSchema.extend({ body: datos });

export type ListarReintegrosQuery = z.infer<typeof listarReintegrosSchema>['query'];
export type CrearReintegroInput = z.infer<typeof crearReintegroSchema>['body'];
export type EditarReintegroInput = z.infer<typeof editarReintegroSchema>['body'];
