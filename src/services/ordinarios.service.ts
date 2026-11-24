import { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { ordinariosRepository as repository } from '../repositories/ordinarios.repository';
import { transferenciasRepository } from '../repositories/transferencias.repository';
import { AppError } from '../utils/AppError';
import type { CrearOrdinarioInput, ListarOrdinariosQuery } from '../validations/ordinarios.validation';

export const ordinariosService = {
  listar(query: ListarOrdinariosQuery) {
    return repository.listar(query);
  },

  async obtener(ordinario: string) {
    const ficha = await repository.obtener(ordinario);
    if (!ficha) throw new AppError('Ordinario no encontrado.', 404);
    const decretos = await transferenciasRepository.decretosDelOrdinario(ordinario);
    return { ...ficha, decretos };
  },

  async crear(data: CrearOrdinarioInput, usuario: string) {
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
      if (await repository.existeFolio(data.ordinario, transaction)) {
        throw new AppError('Ya existe un ordinario con ese folio.', 409);
      }
      await repository.crear(data, usuario, transaction);
      return data;
    });
  },
};
