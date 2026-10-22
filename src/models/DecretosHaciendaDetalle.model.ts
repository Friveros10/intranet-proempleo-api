import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface DecretoHaciendaDetalle {
  fol_dechac: string;
  corr_dethac: number;
  corr_mar: number | null;
  corr_detmar: number | null;
  acc_dethac: string | null;
  mon_dethac: string | number | null;
}

export class DecretosHaciendaDetalleModel extends Model<DecretoHaciendaDetalle> implements DecretoHaciendaDetalle {
  declare fol_dechac: string;
  declare corr_dethac: number;
  declare corr_mar: number | null;
  declare corr_detmar: number | null;
  declare acc_dethac: string | null;
  declare mon_dethac: string | number | null;
}

DecretosHaciendaDetalleModel.init({
  fol_dechac: { type: DataTypes.STRING, primaryKey: true },
  corr_dethac: { type: DataTypes.INTEGER, primaryKey: true },
  corr_mar: DataTypes.INTEGER,
  corr_detmar: DataTypes.INTEGER,
  acc_dethac: DataTypes.STRING,
  mon_dethac: DataTypes.DECIMAL,
}, { sequelize, tableName: 'DETDECHACIENDA', schema: 'dbo', timestamps: false });
