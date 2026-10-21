import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Marco {
  corr_mar: number;
  ano_mar: number | null;
  subtitulo_mar: string | null;
  item_mar: string | null;
  linea_mar: string | null;
  nombre_mar: string | null;
  monto_mar: string | number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  est_mar: string | null;
  ema_mar: string | null;
  tip_mar: string | null;
}

export class MarcoModel extends Model<Marco> implements Marco {
  declare corr_mar: number;
  declare ano_mar: number | null;
  declare subtitulo_mar: string | null;
  declare item_mar: string | null;
  declare linea_mar: string | null;
  declare nombre_mar: string | null;
  declare monto_mar: string | number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare est_mar: string | null;
  declare ema_mar: string | null;
  declare tip_mar: string | null;
}

MarcoModel.init({
  corr_mar: { type: DataTypes.INTEGER, primaryKey: true },
  ano_mar: DataTypes.INTEGER,
  subtitulo_mar: DataTypes.STRING,
  item_mar: DataTypes.STRING,
  linea_mar: DataTypes.STRING,
  nombre_mar: DataTypes.STRING,
  monto_mar: DataTypes.DECIMAL,
  usu_cre: DataTypes.STRING,
  fec_cre: DataTypes.DATE,
  usu_mod: DataTypes.STRING,
  fec_mod: DataTypes.DATE,
  usu_eli: DataTypes.STRING,
  fec_eli: DataTypes.DATE,
  est_mar: DataTypes.STRING,
  ema_mar: DataTypes.STRING,
  tip_mar: DataTypes.STRING,
}, { sequelize, tableName: 'MARCO', schema: 'dbo', timestamps: false });
