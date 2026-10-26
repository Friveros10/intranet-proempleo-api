import { marcoRepository } from '../repositories/marco.repository';
import { AppError } from '../utils/AppError';
import type { GuardarMarcoInput, ListarMarcosQuery, OrigenMarco } from '../validations/marco.validation';
import { sequelize } from '../database/sequelize';
import type { Transaction } from 'sequelize';

export const marcoService = {
  listar(query: ListarMarcosQuery) {
    return marcoRepository.listar(query);
  },

  anios() {
    return marcoRepository.anios();
  },

  async obtener(id: number, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const marco = await marcoRepository.obtener(id, origen, transaction);
    if (!marco) throw new AppError('Ley de presupuesto no encontrada', 404);
    const detalles = await marcoRepository.detalles(id, origen, transaction);
    return { ...marco, detalles };
  },

  async crear(data: GuardarMarcoInput, usuario: string) {
    if (data.detalles.some((detalle) => detalle.corr_detmar !== undefined)) {
      throw new AppError('Las glosas nuevas no deben incluir un identificador', 400);
    }
    return sequelize.transaction(async (transaction) => {
      const corr_mar = await marcoRepository.crear({
        ...data, est_mar: 'ACTIVO', tip_mar: null, ema_mar: null,
      }, usuario, transaction);
      for (const detalle of data.detalles) {
        await marcoRepository.guardarDetalle(corr_mar, data, detalle, usuario, transaction);
      }
      return this.obtener(corr_mar, 'proempleo', transaction);
    });
  },

  async actualizar(id: number, data: GuardarMarcoInput, usuario: string) {
    return sequelize.transaction(async (transaction) => {
      const marco = await marcoRepository.obtener(id, 'proempleo', transaction);
      if (!marco) throw new AppError('Ley de presupuesto de ProEmpleo no encontrada', 404);
      const detalles = await marcoRepository.detalles(id, 'proempleo', transaction);
      const existentes = new Set(detalles.map((detalle) => detalle.corr_detmar));
      if (data.detalles.some((detalle) => detalle.corr_detmar !== undefined && !existentes.has(detalle.corr_detmar))) {
        throw new AppError('Una glosa no pertenece a esta ley de presupuesto', 400);
      }
      await marcoRepository.actualizar(id, data, usuario, transaction);
      const conservados = new Set(data.detalles.map((detalle) => detalle.corr_detmar));
      await marcoRepository.eliminarDetalles(id, [...existentes].filter((idDetalle) => !conservados.has(idDetalle)), transaction);
      for (const detalle of data.detalles) {
        await marcoRepository.guardarDetalle(id, data, detalle, usuario, transaction);
      }
      return this.obtener(id, 'proempleo', transaction);
    });
  },
};
