import { z } from 'zod';
import { Banco_proyectos } from '../constants/BancoProyectos';
import { DetalleDeGastos } from '../constants/DetalleDeGastos';

const id = z.coerce.number().int().positive().max(2147483647);
const monto = z.string().trim().regex(/^\d{1,18}$/, 'El monto debe ser un entero no negativo de hasta 18 dígitos');
const fecha = z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
  .refine((valor) => {
    const [anio, mes, dia] = valor.split('-').map(Number);
    const date = new Date(Date.UTC(anio, mes - 1, dia));
    return date.getUTCFullYear() === anio && date.getUTCMonth() === mes - 1 && date.getUTCDate() === dia;
  }, 'La fecha no es válida');

export const JORNADAS_PROYECTO = ['Completa', 'Media', 'Tres Cuartos'] as const;

export const listarProyectosSchema = z.object({
  query: z.object({
    folio: id.optional(),
    banco: id.optional(),
    anio: z.coerce.number().int().min(1900).max(3000).optional(),
    intermediario: id.optional(),
    ejecutor: id.optional(),
    region: id.optional(),
    comuna: id.optional(),
    page: z.coerce.number().int().positive().default(1),
  }),
});

export const obtenerProyectoSchema = z.object({
  params: z.object({ folio: id }),
  query: z.object({ origen: z.enum(['legacy', 'proempleo']).default('legacy') }).default({}),
});

export const eliminarProyectoSchema = z.object({
  params: z.object({ folio: id }),
});

export const listarBeneficiariosProyectoSchema = z.object({
  params: z.object({ folio: id }),
  query: z.object({
    origen: z.enum(['legacy', 'proempleo']).default('legacy'),
    anio: z.coerce.number().int().min(1900).max(3000).optional(),
    mes: z.coerce.number().int().min(1).max(12).optional(),
    page: z.coerce.number().int().positive().default(1),
  }).default({}),
});

export const agregarBeneficiarioProyectoSchema = z.object({
  params: z.object({ folio: id }),
  body: z.object({
    rut: z.string().trim().min(3).max(20),
    anio: z.number().int().min(1900).max(3000),
    mes: z.number().int().min(1).max(12),
    dir_benpro: z.string().trim().min(1, 'La dirección de trabajo es obligatoria').max(250),
    horario_benpro: z.string().trim().min(1, 'El horario es obligatorio').max(200),
  }).strict(),
});

export const buscarBeneficiarioProyectoSchema = z.object({
  params: z.object({ folio: id }),
  query: z.object({
    rut: z.string().trim().min(3).max(20),
    anio: z.coerce.number().int().min(1900).max(3000),
    mes: z.coerce.number().int().min(1).max(12),
  }),
});

export const eliminarBeneficiarioProyectoSchema = z.object({
  params: z.object({ folio: id, rut: id }),
  query: z.object({
    anio: z.coerce.number().int().min(1900).max(3000),
    mes: z.coerce.number().int().min(1).max(12),
  }),
});

export const catalogoPorComunaSchema = z.object({
  query: z.object({ comuna: id.optional() }),
});

const gastoSchema = z.object({
  corr_itemGas: z.number().int()
    .refine((valor) => DetalleDeGastos.some((detalle) => detalle.id === valor), 'El detalle de gasto no es válido'),
  mon_proitemgas: monto,
  compaGas: monto,
}).strict();

export const guardarProyectoSchema = z.object({
  body: z.object({
    fol_pro: z.number().int().positive().max(2147483647),
    banco_pro: z.number().int()
      .refine((valor) => Banco_proyectos.some((banco) => banco.id === valor), 'El banco de proyectos no es válido'),
    ano_pro: z.number().int().min(1900).max(3000),
    rutint_pro: z.number().int().positive().max(2147483647),
    ruteje_pro: z.number().int().positive().max(2147483647),
    reg_pro: id,
    ciu_pro: id,
    com_pro: id,
    obj_pro: z.string().trim().min(1, 'El objetivo es obligatorio').max(200),
    imp_pro: z.string().trim().max(200).nullable().default(null),
    mon_pro: monto,
    jor_pro: z.enum(JORNADAS_PROYECTO),
    emp_pro: z.number().int().min(0, 'La cantidad de beneficiarios no puede ser negativa').max(2147483647),
    fecini_pro: fecha,
    fecter_pro: fecha,
    rutres_pro: z.number().int().positive().max(2147483647),
    gastos: z.array(gastoSchema).max(DetalleDeGastos.length).default([]),
  }).strict()
    .refine((body) => body.fecter_pro >= body.fecini_pro, {
      message: 'La fecha hasta no puede ser anterior a la fecha desde',
      path: ['fecter_pro'],
    })
    .refine((body) => new Set(body.gastos.map((gasto) => gasto.corr_itemGas)).size === body.gastos.length, {
      message: 'No se puede repetir el mismo detalle de gasto',
      path: ['gastos'],
    }),
});

export type ListarProyectosQuery = z.infer<typeof listarProyectosSchema>['query'];
export type GuardarProyectoInput = z.infer<typeof guardarProyectoSchema>['body'];
export type GastoProyectoInput = z.infer<typeof gastoSchema>;
