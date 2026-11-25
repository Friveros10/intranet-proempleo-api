import { DataTypes, Model, literal, type Optional } from "sequelize";
import { sequelize } from "../database/sequelize";
import { atributosItemGasto, type ItemGasto } from "./ItemGastos.model";

export class ItemGastosProempleoModel extends Model<
  ItemGasto,
  Optional<ItemGasto, "corr_itemGas" | "fec_cre" | "categoria">
> {}
ItemGastosProempleoModel.init(
  {
    ...atributosItemGasto,
    corr_itemGas: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    fec_cre: {
      type: "DATETIME",
      allowNull: false,
      defaultValue: literal("GETDATE()"),
    },
  },
  {
    sequelize,
    schema: "dbo",
    tableName: "itemgastos_proempleo",
    timestamps: false,
  },
);
