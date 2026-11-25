import { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { detalleGastosRepository as repository } from "../repositories/detalleGastos.repository";
import { AppError } from "../utils/AppError";
import type {
  CrearDetalleGastoInput,
  ListarDetalleGastosQuery,
} from "../validations/detalleGastos.validation";

async function buscarProyecto(
  decreto: string,
  folio: number,
  transaction?: Transaction,
) {
  const proyecto = await repository.buscarProyecto(decreto, folio, transaction);
  if (!proyecto)
    throw new AppError(
      "No se encontró el proyecto asociado a este decreto.",
      404,
    );
  if (!proyecto.region || proyecto.region < 0)
    throw new AppError("El proyecto no tiene una región registrada.", 409);
  const items = await repository.items(proyecto, transaction);
  const { marco, origen, ...datos } = proyecto;
  return { ...datos, items };
}

export const detalleGastosService = {
  buscarProyecto,

  listar(query: ListarDetalleGastosQuery) {
    return repository.listar(query);
  },

  crear(data: CrearDetalleGastoInput, usuario: string) {
    return sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction) => {
        const proyecto = await buscarProyecto(
          data.decreto,
          data.folio,
          transaction,
        );
        if (!proyecto.items.some(({ id }) => id === data.item)) {
          throw new AppError(
            "El ítem de gasto no está asignado al proyecto.",
            400,
          );
        }
        return repository.crear(data, proyecto.region, usuario, transaction);
      },
    );
  },
};
