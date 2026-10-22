import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface DecretoHacienda {
  fol_dechac: string;
  fec_dechac: Date | null;
  mon_dechac: string | number | null;
  obs_dechac: string | null;
  est_dechac: string | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
}

export class DecretosHaciendaModel extends Model<DecretoHacienda> implements DecretoHacienda {
  declare fol_dechac: string;
  declare fec_dechac: Date | null;
  declare mon_dechac: string | number | null;
  declare obs_dechac: string | null;
  declare est_dechac: string | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
}

DecretosHaciendaModel.init({
  fol_dechac: { type: DataTypes.STRING, primaryKey: true },
  fec_dechac: DataTypes.DATE,
  mon_dechac: DataTypes.DECIMAL,
  obs_dechac: DataTypes.STRING,
  est_dechac: DataTypes.STRING,
  usu_cre: DataTypes.STRING,
  fec_cre: DataTypes.DATE,
  usu_mod: DataTypes.STRING,
  fec_mod: DataTypes.DATE,
  usu_eli: DataTypes.STRING,
  fec_eli: DataTypes.DATE,
}, { sequelize, tableName: 'DECHACIENDA', schema: 'dbo', timestamps: false });
