import { marcoRepository } from '../repositories/marco.repository';
import { AppError } from '../utils/AppError';
import type { ListarMarcosQuery } from '../validations/marco.validation';

export const marcoService = {
  listar(query: ListarMarcosQuery) {
    return marcoRepository.listar(query);
  },

  anios() {
    return marcoRepository.anios();
  },

  async obtener(id: number) {
    const marco = await marcoRepository.obtener(id);
    if (!marco) throw new AppError('Ley de presupuesto no encontrada', 404);
    const detalles = await marcoRepository.detalles(id);
    return { ...marco.toJSON(), detalles };
  },
};
