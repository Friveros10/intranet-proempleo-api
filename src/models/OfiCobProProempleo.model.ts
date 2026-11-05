// crea oficio de coberturas / proyecto proempleo una tabla intermedia entre oficiocobertura_proempleo y proyecto_proempleo
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize";

export interface OfiCobProProempleo {
  fol_pro: number;
  corr_ofi: number;

  usu_cre: string | null;
  fec_cre: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
}

export class OfiCobProProempleoModel
  extends Model<OfiCobProProempleo, OfiCobProProempleo>
  implements OfiCobProProempleo
{
  declare fol_pro: number;
  declare corr_ofi: number;

  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
}

OfiCobProProempleoModel.init(
  {
    corr_ofi: { type: DataTypes.INTEGER, primaryKey: true },
    fol_pro: { type: DataTypes.INTEGER, primaryKey: true },
    usu_cre: DataTypes.STRING,
    fec_cre: DataTypes.DATE,
    usu_eli: DataTypes.STRING,
    fec_eli: DataTypes.DATE,
    usu_mod: DataTypes.STRING,
    fec_mod: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "OFICOBPROPROEMPLEO",
    schema: "dbo",
    timestamps: false,
  },
);
