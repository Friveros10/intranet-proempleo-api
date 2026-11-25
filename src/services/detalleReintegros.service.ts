import { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { detalleGastosRepository } from '../repositories/detalleGastos.repository';
import { detalleReintegrosRepository as repository } from '../repositories/detalleReintegros.repository';
import { AppError } from '../utils/AppError';
import type { CrearReintegroInput, EditarReintegroInput, ListarReintegrosQuery } from '../validations/detalleReintegros.validation';

async function buscarProyecto(decreto: string, folio: number, transaction?: Transaction) {
  const proyecto = await detalleGastosRepository.buscarProyecto(decreto, folio, transaction);
  if (!proyecto) throw new AppError('No se encontró el proyecto asociado a este decreto.', 404);
  if (!proyecto.region || proyecto.region < 0) throw new AppError('El proyecto no tiene una región registrada.', 409);
  return { folio: proyecto.folio, nombre: proyecto.nombre, region: proyecto.region, nombreRegion: proyecto.nombreRegion };
}

export const detalleReintegrosService = {
  buscarProyecto,
  listar(query: ListarReintegrosQuery) {
    return repository.listar(query);
  },
  crear(data: CrearReintegroInput, usuario: string) {
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
      const proyecto = await buscarProyecto(data.decreto, data.folio, transaction);
      return repository.crear(data, proyecto.region, usuario, transaction);
    });
  },
  async cambiar(id: number, data: EditarReintegroInput | null, usuario: string) {
    const reintegro = await repository.cambiar(id, data, usuario);
    if (!reintegro) throw new AppError('Reintegro ProEmpleo no encontrado.', 404);
    return reintegro;
  },
};
