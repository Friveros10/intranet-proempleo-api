import { DataTypes, Model, type ModelAttributes } from "sequelize";
import { sequelize } from "../database/sequelize";

export interface DetRendicion {
  corr_detren: number;
  mes_detren: number;
  ano_detren: number;
  fol_dec: string;
  fol_pro: number;
  mon_detren: string;
  che_detren: string;
  fac_detren: string;
  fecfac_detren: Date | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_eli: Date | null;
  est_detren: string | null;
  corr_ren: number | null;
  corr_itemgas: number | null;
  egr_detren: string | null;
  glo_detren: string | null;
  cod_region: number | null;
  EstApr_detren: string | null;
  corr_detren3: number | null;
}

export const atributosDetRendicion: ModelAttributes<
  Model<DetRendicion>,
  DetRendicion
> = {
  corr_detren: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  mes_detren: { type: DataTypes.INTEGER, allowNull: false },
  ano_detren: { type: DataTypes.INTEGER, allowNull: false },
  fol_dec: { type: "CHAR(8)", allowNull: false },
  fol_pro: { type: DataTypes.INTEGER, allowNull: false },
  mon_detren: { type: "NUMERIC(18,0)", allowNull: false },
  che_detren: { type: "VARCHAR(15)", allowNull: false },
  fac_detren: { type: "NUMERIC(18,0)", allowNull: false },
  fecfac_detren: "DATETIME",
  usu_cre: "VARCHAR(50)",
  fec_cre: "DATETIME",
  usu_mod: "VARCHAR(50)",
  fec_eli: "DATETIME",
  est_detren: "VARCHAR(50)",
  corr_ren: DataTypes.INTEGER,
  corr_itemgas: DataTypes.INTEGER,
  egr_detren: "VARCHAR(15)",
  glo_detren: "VARCHAR(200)",
  cod_region: DataTypes.INTEGER,
  EstApr_detren: "VARCHAR(15)",
  corr_detren3: DataTypes.INTEGER,
};

export class DetRendicionModel extends Model<DetRendicion> {}
DetRendicionModel.init(atributosDetRendicion, {
  sequelize,
  schema: "dbo",
  tableName: "DETRENDICION",
  timestamps: false,
});
