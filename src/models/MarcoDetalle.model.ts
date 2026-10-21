import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface MarcoDetalle {
  glo_detmar: string | null;
  ano_mar: number | null;
  subtitulo_mar: string | null;
  item_mar: string | null;
  linea_mar: string | null;
  corr_detmar: number;
  nom_detmar: string | null;
  acc_detmar: string | null;
  mon_detmar: string | number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  corr_mar: number | null;
}

export class MarcoDetalleModel extends Model<MarcoDetalle> implements MarcoDetalle {
  declare corr_detmar: number;
  declare corr_mar: number | null;
  declare glo_detmar: string | null;
  declare ano_mar: number | null;
  declare subtitulo_mar: string | null;
  declare item_mar: string | null;
  declare linea_mar: string | null;
  declare nom_detmar: string | null;
  declare acc_detmar: string | null;
  declare mon_detmar: string | number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
}

MarcoDetalleModel.init({
  glo_detmar: DataTypes.STRING,
  ano_mar: DataTypes.INTEGER,
  subtitulo_mar: DataTypes.STRING,
  item_mar: DataTypes.STRING,
  linea_mar: DataTypes.STRING,
  corr_detmar: { type: DataTypes.INTEGER, primaryKey: true },
  nom_detmar: DataTypes.STRING,
  acc_detmar: DataTypes.STRING,
  mon_detmar: DataTypes.DECIMAL,
  usu_cre: DataTypes.STRING,
  fec_cre: DataTypes.DATE,
  usu_mod: DataTypes.STRING,
  fec_mod: DataTypes.DATE,
  usu_eli: DataTypes.STRING,
  fec_eli: DataTypes.DATE,
  corr_mar: DataTypes.INTEGER,
}, { sequelize, tableName: 'MARCODET', schema: 'dbo', timestamps: false });
