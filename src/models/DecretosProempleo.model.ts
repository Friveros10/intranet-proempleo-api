import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Decreto } from './Decretos.model';

export class DecretosProempleoModel extends Model<Decreto> {}

DecretosProempleoModel.init({
  fol_dec: { type: 'CHAR(8)', primaryKey: true, allowNull: false },
  folprov_dec: 'CHAR(8)',
  ano_dec: { type: DataTypes.INTEGER, allowNull: false },
  fec_dec: { type: 'DATETIME', allowNull: false },
  obs_dec: 'VARCHAR(250)',
  mon_dec: { type: 'NUMERIC(18,0)', allowNull: false },
  cob_dec: 'VARCHAR(15)',
  usu_cre: 'VARCHAR(50)', fec_cre: 'DATETIME',
  usu_mod: 'VARCHAR(50)', fec_mod: 'DATETIME',
  usu_eli: 'VARCHAR(50)', fec_eli: 'DATETIME',
  est_dec: 'VARCHAR(50)',
  rutint_dec: DataTypes.INTEGER,
  programaInt: 'VARCHAR(250)',
}, { sequelize, schema: 'dbo', tableName: 'decretos_proempleo', timestamps: false });
