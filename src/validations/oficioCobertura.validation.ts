import { z } from 'zod';

export const JORNADAS_OFICIO = ['Completa', 'Media', 'Tres Cuartos'] as const;
export const TIPO_COBERTURA = 'Regular';

const id = z.coerce.number().int().positive().max(2147483647);
const anio = z.coerce.number().int().min(1900).max(9998);
const folio = z.string().trim().min(1).max(10)
  .regex(/^[A-Za-z0-9]+$/, 'El folio del ordinario debe ser alfanumérico de hasta 10 caracteres');
const camposPeriodo = {
  ano_ofi: anio,
  mes_desde: z.number().int().min(1).max(12),
  mes_hasta: z.number().int().min(1).max(12),
};
const periodoValido = (data: { mes_desde: number; mes_hasta: number }) => data.mes_hasta >= data.mes_desde;
const errorPeriodo = { path: ['mes_hasta'], message: 'El mes hasta no puede ser anterior al mes desde' };

export const listarOrdinariosSchema = z.object({
  query: z.object({
    folio: z.string().trim().max(50).optional(),
    origen: z.enum(['legacy', 'proempleo']).optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const folioOficioSchema = z.object({
  params: z.object({ folio }),
});

export const crearOrdinarioSchema = z.object({
  body: z.object({
    ord_ofi: folio, cod_region: id, ...camposPeriodo,
  }).strict().refine(periodoValido, errorPeriodo),
});

export const programasOficioSchema = z.object({
  query: z.object({ anio }),
});

export const ciudadesOficioSchema = z.object({
  query: z.object({ region: id }),
});

export const comunasOficioSchema = z.object({
  query: z.object({ ciudad: id }),
});

export const guardarCoberturasSchema = z.object({
  body: z.object({
    ord_ofi: folio,
    corr_mar: z.number().int().positive().max(2147483647),
    periodo: z.object(camposPeriodo).strict().refine(periodoValido, errorPeriodo).optional(),
    coberturas: z.array(z.object({
      cod_reg: z.number().int().positive().max(2147483647),
      cod_ciu: z.number().int().positive().max(2147483647),
      cod_com: z.number().int().positive().max(2147483647),
      jor_ofi: z.enum(JORNADAS_OFICIO),
      ben_ofi: z.number().int().min(0).max(2147483647),
    }).strict()).min(1).max(500),
  }).strict(),
});

export type ListarOrdinariosQuery = z.infer<typeof listarOrdinariosSchema>['query'];
export type GuardarCoberturasInput = z.infer<typeof guardarCoberturasSchema>['body'];

export type CrearOrdinarioInput = z.infer<typeof crearOrdinarioSchema>['body'];
