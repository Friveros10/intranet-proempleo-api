import { z } from 'zod';
import { folioOrdinario } from './ordinarios.validation';

const folioDecreto = z.string().trim().min(1).max(8).transform((folio) => folio.toUpperCase());
const filtrosTabla = z.object({
  page: z.coerce.number().int().min(1).max(2147483647).default(1),
  folio: z.string().trim().max(20).regex(/^\d*$/).default(''),
  comuna: z.string().trim().max(150).default(''),
  anio: z.coerce.number().int().min(1).max(9999).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});
const paramsDecreto = z.object({ decreto: folioDecreto });
const paramsOrdinario = z.object({ ordinario: folioOrdinario });

export const buscarDecretoTransferenciaSchema = z.object({ params: paramsDecreto });
export const proyectosTransferenciaSchema = z.object({
  params: paramsDecreto,
  query: filtrosTabla.omit({ anio: true, mes: true }),
});
export const listarTransferenciasSchema = z.object({ params: paramsOrdinario, query: filtrosTabla });
export const registrarTransferenciaSchema = z.object({
  params: paramsOrdinario,
  body: z.object({
    decreto: folioDecreto,
    folio: z.number().int().positive().max(2147483647),
    monto: z.string().regex(/^[1-9]\d{0,17}$/, 'Ingresa un monto positivo en pesos enteros.'),
  }).strict(),
});

export type FiltrosTransferencias = z.infer<typeof filtrosTabla>;
export type RegistrarTransferenciaInput = z.infer<typeof registrarTransferenciaSchema>['body'];
