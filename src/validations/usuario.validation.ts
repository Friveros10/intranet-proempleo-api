import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  body: z.object({
    rut: z.string({ required_error: 'El RUT es requerido' }).min(2),
    nom_usu: z.string({ required_error: 'El nombre es requerido' }).trim().min(1),
    pat_usu: z.string({ required_error: 'El apellido paterno es requerido' }).trim().min(1),
    mat_usu: z.string({ required_error: 'El apellido materno es requerido' }).trim().min(1),
    reg_usu: z.coerce.number({ required_error: 'La región es requerida' }).int(),
    corr_rol: z.coerce.number({ required_error: 'El perfil es requerido' }).int(),
  }),
});

export const actualizarDatosPersonalesSchema = z.object({
  body: z.object({
    dir_usu: z.string().trim().min(1).nullable().optional(),
    ciu_usu: z.coerce.number().int().nullable().optional(),
    com_usu: z.coerce.number().int().nullable().optional(),
    ema_usu: z.string().trim().email('El email no es válido').nullable().optional(),
  }),
});

export const cambiarClaveSchema = z.object({
  body: z
    .object({
      claveActual: z.string({ required_error: 'La contraseña actual es requerida' }).min(1),
      claveNueva: z.string({ required_error: 'La contraseña nueva es requerida' }).min(4, 'La contraseña nueva debe tener al menos 4 caracteres'),
      claveNuevaConfirmacion: z.string({ required_error: 'Debes confirmar la contraseña nueva' }).min(1),
    })
    .refine((data) => data.claveNueva === data.claveNuevaConfirmacion, {
      message: 'Las contraseñas no coinciden',
      path: ['claveNuevaConfirmacion'],
    }),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>['body'];
export type ActualizarDatosPersonalesInput = z.infer<typeof actualizarDatosPersonalesSchema>['body'];
export type CambiarClaveInput = z.infer<typeof cambiarClaveSchema>['body'];
