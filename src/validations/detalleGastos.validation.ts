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
      cheque: z.string().trim().min(1).max(15).default("1"),
      factura: z
        .string()
        .regex(
          /^\d{1,18}$/,
          "La factura debe ser un número de hasta 18 dígitos.",
        )
        .default("1"),
      egreso: z.string().trim().min(1).max(15).default("1"),
      glosa: z.string().trim().max(200).optional(),
    })
    .strict(),
});
export type ListarDetalleGastosQuery = z.infer<
  typeof listarDetalleGastosSchema
>["query"];
export type CrearDetalleGastoInput = z.infer<
  typeof crearDetalleGastoSchema
>["body"];
