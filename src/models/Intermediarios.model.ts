import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Modelo completo de la tabla legacy dbo.INTERMEDIARIOS (solo lectura).
// Estructura original entregada por el usuario:
//   rut_int, dig_int, nom_int, dir_int, reg_int, ciu_int, com_int, tel_int,
//   usu_cre, fec_cre, usu_mod, fec_mod, usu_eli, fec_eli, Est_int, ema_int,
//   int_int, rut_res (fk responsables)
export interface Intermediarios {
  rut_int: number;
  dig_int: string;
  nom_int: string;
  dir_int: string | null;
  reg_int: number;
  ciu_int: number;
  com_int: number;
  tel_int: number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  Est_int: string | null;
  ema_int: string | null;
  int_int: string | null;
  rut_res: number | null;
}

export class IntermediariosModel extends Model<Intermediarios> implements Intermediarios {
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

IntermediariosModel.init({
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
}, { sequelize, tableName: 'INTERMEDIARIOS', schema: 'dbo', timestamps: false });
