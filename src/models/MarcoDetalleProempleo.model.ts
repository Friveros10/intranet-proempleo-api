import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { MarcoDetalle } from './MarcoDetalle.model';

export interface MarcoDetalleProempleo extends Omit<MarcoDetalle, 'glo_detmar' | 'subtitulo_mar' | 'item_mar' | 'linea_mar'> {
  glo_detmar: number;
  subtitulo_mar: number;
  item_mar: number;
  linea_mar: number;
}

export class MarcoDetalleProempleoModel extends Model<MarcoDetalleProempleo, Optional<MarcoDetalleProempleo, 'corr_detmar'>> {}

MarcoDetalleProempleoModel.init({
  glo_detmar: { type: DataTypes.INTEGER, allowNull: false },
  ano_mar: { type: DataTypes.INTEGER, allowNull: false },
  subtitulo_mar: { type: DataTypes.INTEGER, allowNull: false },
  item_mar: { type: DataTypes.INTEGER, allowNull: false },
  linea_mar: { type: DataTypes.INTEGER, allowNull: false },
  corr_detmar: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nom_detmar: { type: 'VARCHAR(250)', allowNull: false },
  acc_detmar: { type: 'VARCHAR(50)', allowNull: false },
  mon_detmar: { type: 'NUMERIC(18,0)', allowNull: false },
  usu_cre: 'VARCHAR(50)',
  fec_cre: 'DATETIME',
  usu_mod: 'VARCHAR(50)',
  fec_mod: 'DATETIME',
  usu_eli: 'VARCHAR(50)',
  fec_eli: 'DATETIME',
  corr_mar: DataTypes.INTEGER,
}, { sequelize, schema: 'dbo', tableName: 'marcodet_proempleo', timestamps: false });
