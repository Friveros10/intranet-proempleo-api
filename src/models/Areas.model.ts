import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize";

// Catálogo legacy dbo.AREAS (solo lectura). No escribir, sincronizar ni
// alterar esta tabla; tampoco existe una tabla paralela area_proempleo.
export interface Areas {
  cod_are: number;
  nom_are: string | null;
}

export class AreasModel extends Model<Areas> implements Areas {
  declare cod_are: number;
  declare nom_are: string | null;
}

AreasModel.init(
  {
    cod_are: { type: DataTypes.INTEGER, primaryKey: true },
    nom_are: { type: "VARCHAR(150)", allowNull: true },
  },
  { sequelize, tableName: "AREAS", schema: "dbo", timestamps: false },
);
