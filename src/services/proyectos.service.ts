import { sequelize } from '../database/sequelize';
import type { Transaction } from 'sequelize';
import { AppError } from '../utils/AppError';
import { calcularDv, parseRut } from '../utils/rut';
import { Banco_proyectos } from '../constants/BancoProyectos';
import { DetalleDeGastos } from '../constants/DetalleDeGastos';
import { proyectosRepository as repository } from '../repositories/proyectos.repository';
import { regionRepository } from '../repositories/sicap/region.repository';
import type { OrigenMarco } from '../validations/marco.validation';
import type { GuardarResponsableInput } from '../validations/intermediarios.validation';
import type { GuardarProyectoInput, ListarProyectosQuery } from '../validations/proyectos.validation';

const DIAS_POR_MES = 30.4375;

// Meses aproximados entre dos fechas YYYY-MM-DD (rango inclusivo), con la misma
// lógica que replica el formulario: días del período dividido por el promedio de
// días por mes, redondeado y nunca menor a 1.
export function mesesAproximados(desde: string, hasta: string): number {
  const [iniAnio, iniMes, iniDia] = desde.split('-').map(Number);
  const [terAnio, terMes, terDia] = hasta.split('-').map(Number);
  const inicio = Date.UTC(iniAnio, iniMes - 1, iniDia);
  const fin = Date.UTC(terAnio, terMes - 1, terDia);
  const dias = Math.round((fin - inicio) / 86400000) + 1;
  return Math.max(1, Math.round(dias / DIAS_POR_MES));
}

function nombreBanco(id: number): string {
  const banco = Banco_proyectos.find((item) => item.id === id);
  if (!banco) throw new AppError('El banco de proyectos no es válido', 400);
  return banco.nombre_proyecto;
}

function nombreDetalleGasto(id: number): string | null {
  return DetalleDeGastos.find((detalle) => detalle.id === id)?.nombre_detalle.trim() ?? null;
}

/**
 * La distribución se persiste completa, igual que la grilla legacy: cada ítem
 * del catálogo tiene una fila en proitemgas_proempleo, incluso si su monto es 0.
 * Esto evita proyectos sin detalle cuando el usuario no abre el modal de gastos.
 */
function completarDistribucionGastos(gastos: GuardarProyectoInput['gastos']): GuardarProyectoInput['gastos'] {
  const montos = new Map(gastos.map((gasto) => [gasto.corr_itemGas, gasto]));
  return DetalleDeGastos.map((detalle) => ({
    corr_itemGas: detalle.id,
    mon_proitemgas: montos.get(detalle.id)?.mon_proitemgas ?? '0',
    compaGas: montos.get(detalle.id)?.compaGas ?? '0',
  }));
}

function rutValidado(rutFormateado: string) {
  const rut = parseRut(rutFormateado);
  if (calcularDv(rut.cuerpo) !== rut.dv) {
    throw new AppError('El dígito verificador del RUT no es válido', 400);
  }
  return rut;
}

// Intermediario, ejecutor y responsable deben pertenecer a la comuna del
// proyecto: los selectores del formulario se filtran por comuna y el backend
// exige la misma pertenencia.
async function validarReferencias(data: GuardarProyectoInput) {
  if (!await repository.comunaValida(data.reg_pro, data.ciu_pro, data.com_pro)) {
    throw new AppError('La comuna no pertenece a la provincia y región seleccionadas', 400);
  }
  const [intermediario, ejecutor, responsable, anios] = await Promise.all([
    repository.existeIntermediario(data.rutint_pro, data.com_pro),
    repository.existeEjecutor(data.ruteje_pro, data.com_pro),
    repository.existeResponsable(data.rutres_pro, data.com_pro),
    repository.aniosProgramas(),
  ]);
  if (!intermediario) throw new AppError('El intermediario seleccionado no pertenece a la comuna del proyecto', 400);
  if (!ejecutor) throw new AppError('El ejecutor seleccionado no pertenece a la comuna del proyecto', 400);
  if (!responsable) throw new AppError('El responsable seleccionado no pertenece a la comuna del proyecto', 400);
  if (!anios.includes(data.ano_pro)) {
    throw new AppError('El año no corresponde a los programas ingresados en el sistema', 400);
  }
}

export const proyectosService = {
  listar(query: ListarProyectosQuery) {
    return repository.listar(query);
  },

  banco() {
    return Banco_proyectos;
  },

  detalleGastos() {
    return DetalleDeGastos;
  },

  anios() {
    return repository.aniosProgramas();
  },

  regiones() {
    return regionRepository.findRegionesActivas();
  },

  ciudades(region: number) {
    return repository.ciudades(region);
  },

  comunas(filtros: { region?: number; ciudad?: number }) {
    return repository.comunas(filtros);
  },

  intermediarios(comuna?: number) {
    return repository.intermediarios(comuna);
  },

  ejecutores(comuna?: number) {
    return repository.ejecutores(comuna);
  },

  responsables(comuna?: number) {
    return repository.responsables(comuna);
  },

  async crearResponsable(data: GuardarResponsableInput, usuario: string) {
    const rut = rutValidado(data.rut);
    if (!await repository.comunaValida(data.reg_res, data.ciu_res, data.com_res)) {
      throw new AppError('La comuna no pertenece a la provincia y región seleccionadas', 400);
    }
    return sequelize.transaction(async (transaction) => {
      if (await repository.existeResponsable(rut.cuerpo, undefined, transaction)) {
        throw new AppError('Ya existe un responsable con ese RUT', 409);
      }
      await repository.crearResponsable(rut, data, usuario, transaction);
      return { rut_res: rut.cuerpo, dig_res: rut.dv };
    });
  },

  proximoFolio() {
    return repository.proximoFolio();
  },

  async gastos(folio: number, origen: OrigenMarco = 'legacy') {
    const proyecto = await repository.obtener(folio, origen);
    if (!proyecto) throw new AppError('Proyecto no encontrado', 404);
    return proyecto.gastos.map((gasto) => ({
      ...gasto,
      nombre: origen === 'proempleo'
        ? nombreDetalleGasto(gasto.corr_itemGas)
        : gasto.nombre,
    }));
  },

  async obtener(folio: number, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const proyecto = await repository.obtener(folio, origen, transaction);
    if (!proyecto) throw new AppError('Proyecto no encontrado', 404);
    if (origen === 'proempleo') {
      proyecto.gastos = proyecto.gastos.map((gasto) => ({
        ...gasto,
        nombre: nombreDetalleGasto(gasto.corr_itemGas),
      }));
    }
    return proyecto;
  },

  async crear(data: GuardarProyectoInput, usuario: string) {
    const nombre = nombreBanco(data.banco_pro);
    const gastos = completarDistribucionGastos(data.gastos);
    await validarReferencias(data);
    const meses = mesesAproximados(data.fecini_pro, data.fecter_pro);
    return sequelize.transaction(async (transaction) => {
      if (await repository.existeFolio(data.fol_pro, transaction)) {
        throw new AppError('Ya existe un proyecto con ese folio', 409);
      }
      await repository.crear(data, nombre, meses, usuario, transaction);
      await repository.reemplazarGastos(data.fol_pro, gastos, {
        anio: data.ano_pro,
        mes: Number(data.fecini_pro.slice(5, 7)),
        region: data.reg_pro,
        usuario,
      }, transaction);
      return this.obtener(data.fol_pro, 'proempleo', transaction);
    });
  },

  async actualizar(folioParam: number, data: GuardarProyectoInput, usuario: string) {
    if (data.fol_pro !== folioParam) throw new AppError('El folio no se puede modificar', 400);
    const nombre = nombreBanco(data.banco_pro);
    const gastos = completarDistribucionGastos(data.gastos);
    await validarReferencias(data);
    const meses = mesesAproximados(data.fecini_pro, data.fecter_pro);
    return sequelize.transaction(async (transaction) => {
      const actual = await repository.obtener(folioParam, 'proempleo', transaction);
      if (!actual || actual.est_pro === 'ELIMINADO') {
        throw new AppError('Proyecto no encontrado para modificar', 404);
      }
      await repository.actualizar(folioParam, data, nombre, meses, usuario, transaction);
      await repository.reemplazarGastos(folioParam, gastos, {
        anio: data.ano_pro,
        mes: Number(data.fecini_pro.slice(5, 7)),
        region: data.reg_pro,
        usuario,
      }, transaction);
      return this.obtener(folioParam, 'proempleo', transaction);
    });
  },

  async eliminar(folio: number, usuario: string) {
    return sequelize.transaction(async (transaction) => {
      const actual = await repository.obtener(folio, 'proempleo', transaction);
      if (!actual || actual.est_pro === 'ELIMINADO') {
        throw new AppError('Proyecto no encontrado para eliminar', 404);
      }
      await repository.eliminar(folio, usuario, transaction);
      return { fol_pro: folio };
    });
  },
};
