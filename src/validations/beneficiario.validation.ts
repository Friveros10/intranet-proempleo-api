import { z } from 'zod';

export const listarBeneficiariosSchema = z.object({
  query: z.object({
    region: z.coerce.number().int().optional(),
    ciudad: z.coerce.number().int().optional(),
    comuna: z.coerce.number().int().optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(50),
  }),
});

export const crearBeneficiarioSchema = z.object({
  body: z.object({
    rut: z.string({ required_error: 'El RUT es requerido' }).min(2),
    nombres: z.string({ required_error: 'Los nombres son requeridos' }).min(1),
    apellidoPaterno: z.string({ required_error: 'El apellido paterno es requerido' }).min(1),
    apellidoMaterno: z.string({ required_error: 'El apellido materno es requerido' }).min(1),
    fechaNacimiento: z.string({ required_error: 'La fecha de nacimiento es requerida' }).min(1),
    sexo: z.coerce.number().int().nullable().optional(),
    direccion: z.string().trim().min(1).nullable().optional(),
    region: z.coerce.number({ required_error: 'La región es requerida' }).int(),
    ciudad: z.coerce.number({ required_error: 'La ciudad es requerida' }).int(),
    comuna: z.coerce.number({ required_error: 'La comuna es requerida' }).int(),
    telefono: z.string().trim().nullable().optional(),
    celular: z.string().trim().nullable().optional(),
  }),
});

export type ListarBeneficiariosQuery = z.infer<typeof listarBeneficiariosSchema>['query'];
export type CrearBeneficiarioInput = z.infer<typeof crearBeneficiarioSchema>['body'];