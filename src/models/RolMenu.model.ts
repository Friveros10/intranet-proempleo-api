import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface RolMenu {
  corr_RolMen: number;
  corr_rol: number | null;
  corr_men: number | null;
  acc_RolMen: string | null;
}

type RolMenuCreation = Optional<RolMenu, 'corr_RolMen'>;

export class RolMenuModel extends Model<RolMenu, RolMenuCreation> implements RolMenu {
  declare corr_RolMen: number;
  declare corr_rol: number | null;
  declare corr_men: number | null;
  declare acc_RolMen: string | null;
}

RolMenuModel.init(
  {
    corr_RolMen: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    corr_rol: DataTypes.INTEGER,
    corr_men: DataTypes.INTEGER,
    acc_RolMen: DataTypes.STRING,
  },
  { sequelize, tableName: 'rol_menu', schema: 'dbo', timestamps: false }
);