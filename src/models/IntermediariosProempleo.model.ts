import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Intermediarios } from './Intermediarios.model';

// Continuación de dbo.INTERMEDIARIOS: mismas columnas y tipos; aquí se crean y
// editan los registros nuevos. Sin FK ni índices adicionales.
export class IntermediariosProempleoModel extends Model<Intermediarios> implements Intermediarios {
  declare rut_int: number;
  declare dig_int: string;
  declare nom_int: string;
  declare dir_int: string | null;
  declare reg_int: number;
  declare ciu_int: number;
  declare com_int: number;
  declare tel_int: number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare Est_int: string | null;
  declare ema_int: string | null;
  declare int_int: string | null;
  declare rut_res: number | null;
}

IntermediariosProempleoModel.init({
  rut_int: { type: DataTypes.INTEGER, primaryKey: true },
  dig_int: { type: 'NCHAR(1)', allowNull: false },
  nom_int: { type: 'VARCHAR(150)', allowNull: false },
  dir_int: { type: 'VARCHAR(150)', allowNull: true },
  reg_int: { type: DataTypes.INTEGER, allowNull: false },
  ciu_int: { type: DataTypes.INTEGER, allowNull: false },
  com_int: { type: DataTypes.INTEGER, allowNull: false },
  tel_int: { type: DataTypes.INTEGER, allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
  usu_mod: { type: 'VARCHAR(50)', allowNull: true },
  fec_mod: { type: 'DATETIME', allowNull: true },
  usu_eli: { type: 'VARCHAR(50)', allowNull: true },
  fec_eli: { type: 'DATETIME', allowNull: true },
  Est_int: { type: 'VARCHAR(15)', allowNull: true },
  ema_int: { type: 'VARCHAR(50)', allowNull: true },
  int_int: { type: 'CHAR(1)', allowNull: true },
  rut_res: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'intermediarios_proempleo', schema: 'dbo', timestamps: false });
