import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Modelo completo de la tabla legacy dbo.RESPONSABLES (solo lectura).
// Estructura original entregada por el usuario:
//   rut_res, dig_res, nom_res, pat_res, mat_res, dir_res, reg_res, ciu_res,
//   com_res, tel_res, civ_res, nac_res, usu_cre, fec_cre, usu_mod, fec_mod,
//   usu_eli, fec_eli, Est_res, fax_res, ema_res, car_res
export interface Responsables {
  rut_res: number;
  dig_res: string;
  nom_res: string;
  pat_res: string;
  mat_res: string;
  dir_res: string | null;
  reg_res: number;
  ciu_res: number;
  com_res: number;
  tel_res: string | null;
  civ_res: string;
  nac_res: string;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  Est_res: string | null;
  fax_res: string | null;
  ema_res: string | null;
  car_res: string | null;
}

export class ResponsablesModel extends Model<Responsables> implements Responsables {
  declare rut_res: number;
  declare dig_res: string;
  declare nom_res: string;
  declare pat_res: string;
  declare mat_res: string;
  declare dir_res: string | null;
  declare reg_res: number;
  declare ciu_res: number;
  declare com_res: number;
  declare tel_res: string | null;
  declare civ_res: string;
  declare nac_res: string;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare Est_res: string | null;
  declare fax_res: string | null;
  declare ema_res: string | null;
  declare car_res: string | null;
}

ResponsablesModel.init({
  rut_res: { type: DataTypes.INTEGER, primaryKey: true },
  dig_res: { type: 'NCHAR(1)', allowNull: false },
  nom_res: { type: 'VARCHAR(50)', allowNull: false },
  pat_res: { type: 'VARCHAR(50)', allowNull: false },
  mat_res: { type: 'VARCHAR(50)', allowNull: false },
  dir_res: { type: 'VARCHAR(50)', allowNull: true },
  reg_res: { type: DataTypes.INTEGER, allowNull: false },
  ciu_res: { type: DataTypes.INTEGER, allowNull: false },
  com_res: { type: DataTypes.INTEGER, allowNull: false },
  tel_res: { type: 'VARCHAR(50)', allowNull: true },
  civ_res: { type: 'VARCHAR(50)', allowNull: false },
  nac_res: { type: 'VARCHAR(50)', allowNull: false },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
  usu_mod: { type: 'VARCHAR(50)', allowNull: true },
  fec_mod: { type: 'DATETIME', allowNull: true },
  usu_eli: { type: 'VARCHAR(50)', allowNull: true },
  fec_eli: { type: 'DATETIME', allowNull: true },
  Est_res: { type: 'VARCHAR(15)', allowNull: true },
  fax_res: { type: 'VARCHAR(50)', allowNull: true },
  ema_res: { type: 'VARCHAR(60)', allowNull: true },
  car_res: { type: 'VARCHAR(50)', allowNull: true },
}, { sequelize, tableName: 'RESPONSABLES', schema: 'dbo', timestamps: false });
