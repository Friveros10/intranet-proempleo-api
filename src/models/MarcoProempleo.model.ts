import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Marco } from './Marco.model';

export interface MarcoProempleo extends Omit<Marco, 'subtitulo_mar' | 'item_mar' | 'linea_mar'> {
  subtitulo_mar: number;
  item_mar: number;
  linea_mar: number;
}

export class MarcoProempleoModel extends Model<MarcoProempleo, Optional<MarcoProempleo, 'corr_mar'>> {}

MarcoProempleoModel.init({
  corr_mar: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ano_mar: { type: DataTypes.INTEGER, allowNull: false },
  subtitulo_mar: { type: DataTypes.INTEGER, allowNull: false },
  item_mar: { type: DataTypes.INTEGER, allowNull: false },
  linea_mar: { type: DataTypes.INTEGER, allowNull: false },
  nombre_mar: { type: 'VARCHAR(250)', allowNull: false },
  monto_mar: 'NUMERIC(18,0)',
  usu_cre: 'VARCHAR(15)',
  fec_cre: 'DATETIME',
  usu_mod: 'VARCHAR(50)',
  fec_mod: 'DATETIME',
  usu_eli: 'VARCHAR(50)',
  fec_eli: 'DATETIME',
  est_mar: 'VARCHAR(50)',
  ema_mar: 'VARCHAR(50)',
  tip_mar: 'VARCHAR(15)',
}, { sequelize, schema: 'dbo', tableName: 'marco_proempleo', timestamps: false });
