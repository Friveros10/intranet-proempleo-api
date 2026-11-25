import { DataTypes, Model, type ModelAttributes } from "sequelize";
import { sequelize } from "../database/sequelize";

export interface ItemGasto {
  corr_mar: number;
  corr_itemGas: number;
  nom_itemGas: string;
  usu_cre: string;
  fec_cre: Date;
  categoria: string | null;
}

export const atributosItemGasto: ModelAttributes<
  Model<ItemGasto>,
  ItemGasto
> = {
  corr_mar: { type: DataTypes.INTEGER, allowNull: false },
  corr_itemGas: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  nom_itemGas: { type: "VARCHAR(80)", allowNull: false },
  usu_cre: { type: "VARCHAR(50)", allowNull: false },
  fec_cre: { type: "DATETIME", allowNull: false },
  categoria: "VARCHAR(50)",
};

export class ItemGastosModel extends Model<ItemGasto> {}
ItemGastosModel.init(atributosItemGasto, {
  sequelize,
  schema: "dbo",
  tableName: "ITEMGASTOS",
  timestamps: false,
});
