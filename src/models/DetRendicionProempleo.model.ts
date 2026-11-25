import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../database/sequelize";
import { atributosDetRendicion, type DetRendicion } from "./DetRendicion.model";

export class DetRendicionProempleoModel extends Model<
  DetRendicion,
  Optional<DetRendicion, "corr_detren">
> {}
DetRendicionProempleoModel.init(
  {
    ...atributosDetRendicion,
    corr_detren: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
  },
  {
    sequelize,
    schema: "dbo",
    tableName: "detrendicion_proempleo",
    timestamps: false,
  },
);
