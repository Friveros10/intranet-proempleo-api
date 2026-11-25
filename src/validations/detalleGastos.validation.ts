import { z } from "zod";

const folio = z.coerce.number().int().positive().max(2147483647);
const decreto = z
  .string()
  .trim()
  .min(1)
  .max(8)
  .transform((value) => value.toUpperCase());
const periodo = {
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(1900).max(9999),
};
export const listarDetalleGastosSchema = z.object({
  query: z.object({
    decreto,
    ...periodo,
    page: z.coerce.number().int().min(1).max(2147483647).default(1),
  }),
});
export const buscarProyectoGastoSchema = z.object({
  query: z.object({ decreto, folio }),
});
export const crearDetalleGastoSchema = z.object({
  body: z
    .object({
      decreto,
      ...periodo,
      folio,
      item: folio,
      monto: z
        .string()
        .regex(
          /^[1-9]\d{0,17}$/,
          "Ingresa un monto positivo en pesos enteros.",
        ),
      glosa: z.string().trim().max(200).optional(),
      fecfac_detren: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((valor) => {
        const fecha = new Date(`${valor}T00:00:00Z`);
        return valor >= "1753-01-01" && Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
      }, "Ingresa una fecha válida.").nullable().optional(),
    })
    .strict(),
});
export type ListarDetalleGastosQuery = z.infer<
  typeof listarDetalleGastosSchema
>["query"];
export type CrearDetalleGastoInput = z.infer<
  typeof crearDetalleGastoSchema
>["body"];

export const gastoProempleoSchema = z.object({ params: z.object({ id: folio }) });
export const editarDetalleGastoSchema = gastoProempleoSchema.extend({
  body: crearDetalleGastoSchema.shape.body.pick({ monto: true, glosa: true, fecfac_detren: true }),
});
export type EditarDetalleGastoInput = z.infer<typeof editarDetalleGastoSchema>["body"];
