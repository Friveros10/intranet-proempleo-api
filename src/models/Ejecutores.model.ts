import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Modelo completo de la tabla legacy dbo.EJECUTORES (solo lectura).
// Misma estructura que INTERMEDIARIOS, sin email ni marca de intendencia:
//   rut_eje, dig_eje, nom_eje, dir_eje, reg_eje, ciu_eje, com_eje, tel_eje,
//   usu_cre, fec_cre, usu_mod, fec_mod, usu_eli, fec_eli, Est_eje, rut_res
export interface Ejecutores {
  rut_eje: number;
  dig_eje: string;
  nom_eje: string;
  dir_eje: string | null;
  reg_eje: number;
  ciu_eje: number;
  com_eje: number;
  tel_eje: number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  Est_eje: string | null;
  rut_res: number | null;
}

export class EjecutoresModel extends Model<Ejecutores> implements Ejecutores {
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

EjecutoresModel.init({
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
}, { sequelize, tableName: 'EJECUTORES', schema: 'dbo', timestamps: false });
