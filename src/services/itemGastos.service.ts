import { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { itemGastosRepository as repository } from "../repositories/itemGastos.repository";
import { marcoRepository } from "../repositories/marco.repository";
import { AppError } from "../utils/AppError";
import type { GuardarItemGastosInput } from "../validations/itemGastos.validation";
import type { OrigenMarco } from "../validations/marco.validation";

async function verificarMarco(
  marco: number,
  origen: OrigenMarco,
  transaction?: Transaction,
) {
  if (!(await marcoRepository.obtener(marco, origen, transaction)))
    throw new AppError("Marco presupuestario no encontrado.", 404);
}

export const itemGastosService = {
  async listar(marco: number, origen: OrigenMarco) {
    await verificarMarco(marco, origen);
    return repository.listar(marco);
  },

  guardar(
    marco: number,
    origen: OrigenMarco,
    data: GuardarItemGastosInput,
    usuario: string,
  ) {
    return sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction) => {
        await verificarMarco(marco, origen, transaction);
        for (const item of data.nuevos)
          await repository.crear(marco, item, usuario, transaction);
        for (const id of data.eliminar) {
          if (!(await repository.eliminar(marco, id, transaction))) {
            throw new AppError(
              `El ítem ${id} está en uso o ya no está disponible para eliminar.`,
              409,
            );
          }
        }
        return repository.listar(marco, transaction);
      },
    );
  },
};
