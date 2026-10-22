import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Decreto {
  fol_dec: string;
  folprov_dec: string | null;
  ano_dec: number | null;
  fec_dec: Date | null;
  obs_dec: string | null;
  mon_dec: string | number | null;
  cob_dec: string | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  est_dec: string | null;
  rutint_dec: string | null;
  programaInt: string | null;
}

export class DecretosModel extends Model<Decreto> implements Decreto {
  declare fol_dec: string;
  declare folprov_dec: string | null;
  declare ano_dec: number | null;
  declare fec_dec: Date | null;
  declare obs_dec: string | null;
  declare mon_dec: string | number | null;
  declare cob_dec: string | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare est_dec: string | null;
  declare rutint_dec: string | null;
  declare programaInt: string | null;
}

DecretosModel.init({
  fol_dec: { type: DataTypes.STRING, primaryKey: true },
  folprov_dec: DataTypes.STRING,
  ano_dec: DataTypes.INTEGER,
  fec_dec: DataTypes.DATE,
  obs_dec: DataTypes.STRING,
  mon_dec: DataTypes.DECIMAL,
  cob_dec: DataTypes.STRING,
  usu_cre: DataTypes.STRING,
  fec_cre: DataTypes.DATE,
  usu_mod: DataTypes.STRING,
  fec_mod: DataTypes.DATE,
  usu_eli: DataTypes.STRING,
  fec_eli: DataTypes.DATE,
  est_dec: DataTypes.STRING,
  rutint_dec: DataTypes.STRING,
  programaInt: DataTypes.STRING,
}, { sequelize, tableName: 'DECRETOS', schema: 'dbo', timestamps: false });
