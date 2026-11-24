import { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { ordinariosRepository } from '../repositories/ordinarios.repository';
import { transferenciasRepository as repository } from '../repositories/transferencias.repository';
import { AppError } from '../utils/AppError';
import type { FiltrosTransferencias, RegistrarTransferenciaInput } from '../validations/transferencias.validation';

async function buscarDecreto(decreto: string, transaction?: Transaction) {
  const [encontrado] = await repository.buscarDecreto(decreto, transaction);
  if (!encontrado) throw new AppError('Decreto no encontrado.', 404);
  return encontrado;
}

export const transferenciasService = {
  buscarDecreto,

  proyectos(decreto: string, filtros: FiltrosTransferencias) {
    return repository.proyectos(decreto, filtros);
  },

  listar(ordinario: string, filtros: FiltrosTransferencias) {
    return repository.realizadas(ordinario, filtros);
  },

  async registrar(ordinario: string, data: RegistrarTransferenciaInput, usuario: string) {
    const { decreto, folio, monto } = data;
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
      if (!await repository.bloquearProyecto(folio, transaction)) {
        throw new AppError('El proyecto está siendo actualizado. Intenta nuevamente.', 409);
      }
      const oficio = await ordinariosRepository.obtener(ordinario, transaction);
      if (!oficio) throw new AppError('Ordinario no encontrado.', 404);
      await buscarDecreto(decreto, transaction);

      const proyecto = await repository.obtenerProyecto(decreto, folio, transaction);
      if (!proyecto) throw new AppError('El proyecto no está asociado al decreto.', 404);
      const abono = BigInt(monto);
      const saldo = BigInt(proyecto.saldo);
      if (abono > saldo) throw new AppError('El monto supera el saldo disponible del proyecto.', 409);

      await repository.registrar(ordinario, data, oficio.fecha_pago, usuario, transaction);
      return {
        ...proyecto,
        transferido: String(BigInt(proyecto.transferido) + abono),
        saldo: String(saldo - abono),
      };
    });
  },
};
