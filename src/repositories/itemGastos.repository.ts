import { QueryTypes, type Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import type { ItemGasto } from "../models/ItemGastos.model";
import { ItemGastosProempleoModel } from "../models/ItemGastosProempleo.model";
import type { GuardarItemGastosInput } from "../validations/itemGastos.validation";
import { insertarConCorrelativo } from "./correlativosPresupuesto.sql";

type ItemListado = ItemGasto & { origen: "legacy" | "proempleo" };

export const itemGastosRepository = {
  listar(marco: number, transaction?: Transaction) {
    return sequelize.query<ItemListado>(
      `
      SELECT corr_mar, corr_itemGas, RTRIM(nom_itemGas) nom_itemGas, usu_cre, fec_cre, RTRIM(categoria) categoria, origen
      FROM dbo.itemgastos_unificados WHERE corr_mar = :marco ORDER BY corr_itemGas, origen
    `,
      { replacements: { marco }, type: QueryTypes.SELECT, transaction },
    );
  },

  async crear(
    marco: number,
    item: GuardarItemGastosInput["nuevos"][number],
    usuario: string,
    transaction: Transaction,
  ) {
    const [creado] = await sequelize.query<{ corr_itemGas: number }>(
      insertarConCorrelativo(
        "ITEMGASTOS",
        "itemgastos_proempleo",
        "corr_itemGas",
        "corr_mar, nom_itemGas, usu_cre, fec_cre, categoria",
        ":marco, :nombre, :usuario, GETDATE(), :categoria",
      ),
      {
        type: QueryTypes.SELECT,
        replacements: { ...item, marco, usuario },
        transaction,
      },
    );
    return creado.corr_itemGas;
  },

  async eliminar(marco: number, id: number, transaction: Transaction) {
    const [eliminado] = await sequelize.query<Pick<ItemGasto, "corr_itemGas" | "nom_itemGas" | "categoria">>(
      `
      DELETE FROM dbo.[${ItemGastosProempleoModel.tableName}]
      OUTPUT DELETED.corr_itemGas, DELETED.nom_itemGas, DELETED.categoria
      WHERE corr_mar = :marco AND corr_itemGas = :id
        AND NOT EXISTS (SELECT 1 FROM dbo.PROITEMGAS WHERE corr_itemGas = :id)
        AND NOT EXISTS (SELECT 1 FROM dbo.proitemgas_proempleo WHERE corr_itemGas = :id)
        AND NOT EXISTS (SELECT 1 FROM dbo.DETRENDICION WHERE corr_itemgas = :id)
        AND NOT EXISTS (SELECT 1 FROM dbo.detrendicion_proempleo WHERE corr_itemgas = :id)
    `,
      { type: QueryTypes.SELECT, replacements: { marco, id }, transaction },
    );
    return eliminado ?? null;
  },
};
