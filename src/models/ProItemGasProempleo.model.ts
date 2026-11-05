import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { ProItemGas } from './ProItemGas.model';

// Continuación de dbo.PROITEMGAS: mismas columnas y tipos. Aquí se guardan los
// gastos de los proyectos nuevos; corr_itemGas referencia el catálogo estático
// DetalleDeGastos (constants), no la tabla ITEMGASTOS legacy.
export class ProItemGasProempleoModel extends Model<ProItemGas> implements ProItemGas {
  declare corr_itemGas: number;
  declare fol_pro: number;
  declare mon_proitemgas: string;
  declare obs_proitemgas: string | null;
}

ProItemGasProempleoModel.init({
  corr_itemGas: { type: DataTypes.INTEGER, primaryKey: true },
  fol_pro: { type: DataTypes.INTEGER, primaryKey: true },
  mon_proitemgas: { type: 'NUMERIC(18,0)', allowNull: false },
  obs_proitemgas: { type: 'VARCHAR(250)', allowNull: true },
}, { sequelize, tableName: 'proitemgas_proempleo', schema: 'dbo', timestamps: false });
