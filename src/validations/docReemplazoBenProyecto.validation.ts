import { z } from 'zod';

export const crearDocReemplazoSchema = z.object({
  body: z.object({
    idReemplazoBenProyecto: z.coerce.number({ required_error: 'idReemplazoBenProyecto es requerido' }).int(),
    idDocumento: z.coerce.number({ required_error: 'idDocumento es requerido' }).int(),
    idBeneficiario: z.coerce.number({ required_error: 'idBeneficiario es requerido' }).int(),
  }),
});

export const actualizarEstadoDocReemplazoSchema = z.object({
  body: z.object({
    status: z.enum(['aprobado', 'rechazado'], { required_error: 'status es requerido' }),
  }),
});

export type CrearDocReemplazoInput = z.infer<typeof crearDocReemplazoSchema>['body'];
export type ActualizarEstadoDocReemplazoInput = z.infer<typeof actualizarEstadoDocReemplazoSchema>['body'];
