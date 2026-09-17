import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    identificador: z
      .string({ required_error: 'El usuario o email es requerido' })
      .min(3, 'El usuario o email debe tener al menos 3 caracteres'),
    password: z
      .string({ required_error: 'La contraseña es requerida' })
      .min(1, 'La contraseña es requerida'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
