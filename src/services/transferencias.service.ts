import { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { ordinariosRepository } from '../repositories/ordinarios.repository';
import { transferenciasRepository as repository } from '../repositories/transferencias.repository';
import { AppError } from '../utils/AppError';
import type { EditarTransferenciaInput, FiltrosTransferencias, ListarTransferenciasQuery, RegistrarTransferenciaInput } from '../validations/transferencias.validation';

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

  listar(ordinario: string, filtros: ListarTransferenciasQuery) {
    return repository.realizadas(ordinario, filtros);
  },

  async actualizar(ordinario: string, id: number, data: EditarTransferenciaInput, usuario: string) {
    const referencia = await repository.obtenerRealizada(ordinario, id);
    if (!referencia) throw new AppError('Transferencia ProEmpleo no encontrada en el ordinario.', 404);
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
      if (!await repository.bloquearProyecto(referencia.folio, transaction)) {
        throw new AppError('El proyecto está siendo actualizado. Intenta nuevamente.', 409);
      }
      const anterior = await repository.obtenerRealizada(ordinario, id, transaction);
      if (!anterior) throw new AppError('Transferencia ProEmpleo no encontrada en el ordinario.', 404);
      if (BigInt(data.monto) > BigInt(anterior.monto)
        && (anterior.saldo === null || BigInt(data.monto) > BigInt(anterior.saldo))) {
        throw new AppError('El nuevo monto supera el saldo disponible para esta transferencia.', 409);
      }
      const cambios = { ...data, observaciones: data.observaciones ?? anterior.observaciones ?? '' };
      await repository.actualizar(ordinario, id, cambios, usuario, transaction);
      return { anterior, resultado: { ...anterior, ...cambios, observaciones: cambios.observaciones || null } };
    });
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

      const transferencia = await repository.registrar(oficio.ordinario, data, oficio.fecha_pago, usuario, transaction);
      return {
        resultado: {
          ...proyecto,
          transferido: String(BigInt(proyecto.transferido) + abono),
          saldo: String(saldo - abono),
        },
        transferencia, oficio, saldoAnterior: proyecto.saldo, transferidoAnterior: proyecto.transferido,
      };
    });
  },
};
