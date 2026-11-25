import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { ProItemGas } from './ProItemGas.model';

export class ProItemGasProempleoModel extends Model<ProItemGas> {}

ProItemGasProempleoModel.init({
  corr_itemGas: { type: DataTypes.INTEGER, primaryKey: true },
  fol_pro: { type: DataTypes.INTEGER, primaryKey: true },
  mon_proitemgas: { type: 'NUMERIC(18,0)', allowNull: false },
  obs_proitemgas: { type: 'VARCHAR(250)', allowNull: true },
}, { sequelize, tableName: 'proitemgas_proempleo', schema: 'dbo', timestamps: false });
