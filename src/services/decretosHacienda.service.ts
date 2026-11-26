import { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { decretosHaciendaRepository as repository } from "../repositories/decretosHacienda.repository";
import type {
  GuardarDecretoHaciendaInput,
  ListarDecretosHaciendaQuery,
} from "../validations/decretosHacienda.validation";
import type { OrigenMarco } from "../validations/marco.validation";
import { AppError } from "../utils/AppError";

async function validarProgramas(
  data: GuardarDecretoHaciendaInput,
  transaction: Transaction,
  existentes: Awaited<ReturnType<typeof repository.detalles>> = [],
) {
  const verificados = new Set<string>();
  const anio = Number(data.fec_dechac.slice(0, 4));
  for (const detalle of data.detalles) {
    const anterior = existentes.find(
      (item) => item.corr_dethac === detalle.corr_dethac,
    );
    if (
      detalle.corr_detmar === null &&
      !(
        anterior?.corr_detmar === null &&
        anterior.corr_mar === detalle.corr_mar &&
        anterior.origen_mar === detalle.origen_mar
      )
    ) {
      throw new AppError("Selecciona Ejecución o una glosa del programa", 400);
    }
    const glosa = detalle.corr_detmar ?? 0;
    const key = `${detalle.origen_mar}:${detalle.corr_mar}:${glosa}`;
    if (verificados.has(key)) continue;
    if (
      !(await repository.programaDisponible(
        detalle.corr_mar,
        detalle.origen_mar,
        anio,
        glosa,
        transaction,
      ))
    ) {
      throw new AppError(
        "El programa debe estar activo en el año del decreto y la glosa debe pertenecer al programa",
        400,
      );
    }
    verificados.add(key);
  }
}

export const decretosHaciendaService = {
  listar(query: ListarDecretosHaciendaQuery) {
    return repository.listar(query);
  },

  anios() {
    return repository.anios();
  },

  async programas(anio: number) {
    return { anio, data: await repository.programas(anio) };
  },

  async obtener(
    folio: string,
    origen: OrigenMarco = "legacy",
    transaction?: Transaction,
  ) {
    const decreto = await repository.obtener(folio, origen, transaction);
    if (!decreto) throw new AppError("Decreto de Hacienda no encontrado", 404);
    return {
      ...decreto,
      detalles: await repository.detalles(folio, origen, transaction),
    };
  },

  crear(data: GuardarDecretoHaciendaInput, usuario: string) {
    if (data.detalles.some((detalle) => detalle.corr_dethac !== undefined)) {
      throw new AppError(
        "Los detalles nuevos no deben incluir identificadores",
        400,
      );
    }
    return sequelize.transaction(async (transaction) => {
      if (
        (await repository.obtener(data.fol_dechac, "proempleo", transaction)) ||
        (await repository.obtener(data.fol_dechac, "legacy", transaction))
      ) {
        throw new AppError(
          "Ya existe un decreto de Hacienda con ese folio",
          409,
        );
      }
      await validarProgramas(data, transaction);
      await repository.crear(data, usuario, transaction);
      for (const detalle of data.detalles)
        await repository.guardarDetalle(data.fol_dechac, detalle, transaction);
      return this.obtener(data.fol_dechac, "proempleo", transaction);
    });
  },

  actualizar(
    folio: string,
    data: GuardarDecretoHaciendaInput,
    usuario: string,
  ) {
    if (data.fol_dechac !== folio)
      throw new AppError(
        "El folio de un decreto existente no se puede cambiar",
        400,
      );
    return sequelize.transaction(async (transaction) => {
      const anterior = await repository.obtener(folio, "proempleo", transaction);
      if (!anterior) {
        throw new AppError("Decreto de Hacienda no encontrado", 404);
      }
      const existentes = await repository.detalles(
        folio,
        "proempleo",
        transaction,
      );
      const ids = new Set(existentes.map((detalle) => detalle.corr_dethac));
      if (
        data.detalles.some(
          (detalle) =>
            detalle.corr_dethac !== undefined && !ids.has(detalle.corr_dethac),
        )
      ) {
        throw new AppError("Un detalle no pertenece a este decreto", 400);
      }
      await validarProgramas(data, transaction, existentes);
      await repository.actualizar(folio, data, usuario, transaction);
      const conservados = new Set(
        data.detalles.map((detalle) => detalle.corr_dethac),
      );
      await repository.eliminarDetalles(
        folio,
        [...ids].filter((id) => !conservados.has(id)),
        transaction,
      );
      for (const detalle of data.detalles)
        await repository.guardarDetalle(folio, detalle, transaction);
      const decreto = await this.obtener(folio, "proempleo", transaction);
      return { decreto, anterior, detallesAnteriores: existentes };
    });
  },
};
