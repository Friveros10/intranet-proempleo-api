import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Mapea dbo.PROITEMGAS (gastos por proyecto del circuito original), de solo
// lectura y sin timestamps. PK compuesta corr_itemGas + fol_pro; el nombre del
// ítem legacy vive en dbo.ITEMGASTOS. No escribir ni alterar esta tabla.
export interface ProItemGas {
  corr_itemGas: number;
  fol_pro: number;
  mon_proitemgas: string;
  obs_proitemgas: string | null;
}

export class ProItemGasModel extends Model<ProItemGas> implements ProItemGas {
  declare corr_itemGas: number;
  declare fol_pro: number;
  declare mon_proitemgas: string;
  declare obs_proitemgas: string | null;
}

ProItemGasModel.init({
  corr_itemGas: { type: DataTypes.INTEGER, primaryKey: true },
  fol_pro: { type: DataTypes.INTEGER, primaryKey: true },
  mon_proitemgas: { type: 'NUMERIC(18,0)', allowNull: false },
  obs_proitemgas: { type: 'VARCHAR(250)', allowNull: true },
}, { sequelize, tableName: 'PROITEMGAS', schema: 'dbo', timestamps: false });
