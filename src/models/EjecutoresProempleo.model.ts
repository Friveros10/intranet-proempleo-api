import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Ejecutores } from './Ejecutores.model';

// Continuación de dbo.EJECUTORES: mismas columnas y tipos; aquí se crean y
// editan los registros nuevos. Sin FK ni índices adicionales.
export class EjecutoresProempleoModel extends Model<Ejecutores> implements Ejecutores {
  declare rut_eje: number;
  declare dig_eje: string;
  declare nom_eje: string;
  declare dir_eje: string | null;
  declare reg_eje: number;
  declare ciu_eje: number;
  declare com_eje: number;
  declare tel_eje: number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare Est_eje: string | null;
  declare rut_res: number | null;
}

EjecutoresProempleoModel.init({
  rut_eje: { type: DataTypes.INTEGER, primaryKey: true },
  dig_eje: { type: 'NCHAR(1)', allowNull: false },
  nom_eje: { type: 'VARCHAR(150)', allowNull: false },
  dir_eje: { type: 'VARCHAR(150)', allowNull: true },
  reg_eje: { type: DataTypes.INTEGER, allowNull: false },
  ciu_eje: { type: DataTypes.INTEGER, allowNull: false },
  com_eje: { type: DataTypes.INTEGER, allowNull: false },
  tel_eje: { type: DataTypes.INTEGER, allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
  usu_mod: { type: 'VARCHAR(50)', allowNull: true },
  fec_mod: { type: 'DATETIME', allowNull: true },
  usu_eli: { type: 'VARCHAR(50)', allowNull: true },
  fec_eli: { type: 'DATETIME', allowNull: true },
  Est_eje: { type: 'VARCHAR(15)', allowNull: true },
  rut_res: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'ejecutores_proempleo', schema: 'dbo', timestamps: false });
