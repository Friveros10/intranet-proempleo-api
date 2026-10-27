import { decretosRepository as repository } from '../repositories/decretos.repository';
import type { GuardarDecretoInput, ListarDecretosQuery } from '../validations/decretos.validation';
import type { OrigenMarco } from '../validations/marco.validation';
import { sequelize } from '../database/sequelize';
import type { Transaction } from 'sequelize';
import { AppError } from '../utils/AppError';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';

export const decretosService = {
  async intermediarios(rut: number) {
    const usuario = await usuarioSicapRepository.findByRut(rut);
    if (!usuario) throw new AppError('Usuario no encontrado', 401);
    return repository.intermediarios();
  },
  listar(query: ListarDecretosQuery) {
    return repository.listar(query);
  },

  anios() {
    return repository.anios();
  },

  async programas() {
    const anio = new Date().getFullYear();
    return { anio, data: await repository.programas(anio) };
  },

  glosas(id: number) {
    return repository.glosas(id);
  },

  async obtener(folio: string, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const decreto = await repository.obtener(folio, origen, transaction);
    if (!decreto) throw new AppError('Decreto no encontrado', 404);
    return { ...decreto, detalles: await repository.detalles(folio, origen, transaction) };
  },

  async crear(data: GuardarDecretoInput, usuario: string) {
    await validarIntermediario(data.rutint_dec, Number(usuario));
    return sequelize.transaction(async (transaction) => {
      const existente = await repository.obtener(data.fol_dec, 'proempleo', transaction);
      if (existente || await repository.obtener(data.fol_dec, 'legacy', transaction)) {
        throw new AppError('Ya existe un decreto con ese folio', 409);
      }
      await validarReferencias(data, transaction);
      await repository.crear(data, usuario, transaction);
      await repository.reemplazarDetalles(data.fol_dec, data.detalles, transaction);
      return this.obtener(data.fol_dec, 'proempleo', transaction);
    });
  },

  async actualizar(folio: string, data: GuardarDecretoInput, usuario: string) {
    if (data.fol_dec !== folio) throw new AppError('El folio no se puede modificar', 400);
    await validarIntermediario(data.rutint_dec, Number(usuario));
    return sequelize.transaction(async (transaction) => {
      const decreto = await repository.obtener(folio, 'proempleo', transaction);
      if (!decreto) throw new AppError('Decreto no encontrado para modificar', 404);
      if (data.folprov_dec !== decreto.folprov_dec) throw new AppError('El folio provisorio no se puede modificar', 400);
      const anteriores = await repository.detalles(folio, 'proempleo', transaction);
      await validarReferencias(data, transaction, anteriores);
      await repository.actualizar(folio, data, usuario, transaction);
      await repository.reemplazarDetalles(folio, data.detalles, transaction);
      return this.obtener(folio, 'proempleo', transaction);
    });
  },
};

async function validarIntermediario(rut: number, usuario: number) {
  const intermediarios = await decretosService.intermediarios(usuario);
  if (!intermediarios.some((item) => item.rut_int === rut)) {
    throw new AppError('Selecciona un intermediario registrado', 400);
  }
}

async function validarReferencias(data: GuardarDecretoInput, transaction: Transaction,
  anteriores: { corr_mar: number | null; corr_detmar: number | null }[] = []) {
  const verificadas = new Set<string>();
  for (const detalle of data.detalles) {
    if (anteriores.some((item) => item.corr_mar === detalle.corr_mar && item.corr_detmar === detalle.corr_detmar)) continue;
    const key = `${detalle.corr_mar}:${detalle.corr_detmar}`;
    if (verificadas.has(key)) continue;
    if (!await repository.referenciaDisponible(detalle.corr_mar, detalle.corr_detmar, new Date().getFullYear(), transaction)) {
      throw new AppError('La glosa no pertenece al programa o el programa no está activo en el año en curso', 400);
    }
    verificadas.add(key);
  }
}
