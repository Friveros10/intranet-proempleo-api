import { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { detalleGastosRepository as repository } from "../repositories/detalleGastos.repository";
import { AppError } from "../utils/AppError";
import { bloquearGastosProyecto } from "../repositories/montosProyecto.sql";
import type {
  CrearDetalleGastoInput,
  EditarDetalleGastoInput,
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
  return { proyecto, items };
}

async function cambiarGasto(id: number, data: EditarDetalleGastoInput | null, usuario: string) {
  const referencia = await repository.obtenerProempleo(id);
  if (!referencia) throw new AppError("Gasto ProEmpleo no encontrado.", 404);
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
    if (!await bloquearGastosProyecto(referencia.folio, transaction)) {
      throw new AppError("El proyecto está siendo actualizado. Intenta nuevamente.", 409);
    }
    const gasto = await repository.obtenerProempleo(id, transaction);
    if (!gasto) throw new AppError("Gasto ProEmpleo no encontrado.", 404);
    const diferencia = BigInt(data?.monto ?? "0") - BigInt(gasto.monto);
    if (diferencia > 0n) {
      const item = (await repository.items(gasto, transaction)).find(({ id: itemId }) => itemId === gasto.item);
      if (!item || diferencia > BigInt(item.saldo)) {
        throw new AppError("El aumento supera el saldo disponible del ítem.", 409);
      }
    }
    if (gasto.asiento && diferencia !== 0n &&
      (gasto.item === null || !await repository.ajustarAcumulado(gasto.folio, gasto.item, String(diferencia), transaction))) {
      throw new AppError("No se pudo ajustar el gasto acumulado del ítem.", 409);
    }
    const resultado = await repository.cambiar(id, data, usuario, transaction);
    return { resultado, anterior: gasto };
  });
}

export const detalleGastosService = {
  cambiarGasto,
  async buscarProyecto(decreto: string, folio: number) {
    const { proyecto, items } = await buscarProyecto(decreto, folio);
    const { marco, origen, ...datos } = proyecto;
    return { ...datos, items: items.map(({ id, nombre, saldo }) => ({ id, nombre, saldo })) };
  },

  listar(query: ListarDetalleGastosQuery) {
    return repository.listar(query);
  },

  crear(data: CrearDetalleGastoInput, usuario: string) {
    return sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction) => {
        if (!await bloquearGastosProyecto(data.folio, transaction)) {
          throw new AppError("El proyecto está siendo actualizado. Intenta nuevamente.", 409);
        }
        const { proyecto, items } = await buscarProyecto(
          data.decreto,
          data.folio,
          transaction,
        );
        const item = items.find(({ id }) => id === data.item);
        if (!item || BigInt(data.monto) > BigInt(item.saldo)) {
          throw new AppError(
            "El gasto supera el saldo disponible del ítem o el ítem ya no tiene saldo.",
            409,
          );
        }
        const resultado = await repository.crear(data, proyecto, item, usuario, transaction);
        return { resultado, region: proyecto.region, nombreItem: item.nombre };
      },
    );
  },
};
