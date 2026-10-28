import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Responsables } from './Responsables.model';

// Continuación de dbo.RESPONSABLES: mismas columnas y tipos; aquí se crean y
// editan los registros nuevos. Sin FK ni índices adicionales.
export class ResponsablesProempleoModel extends Model<Responsables> implements Responsables {
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

ResponsablesProempleoModel.init({
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
}, { sequelize, tableName: 'responsables_proempleo', schema: 'dbo', timestamps: false });
