import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import { RolSicap } from './RolSicap';

type RolSicapCreation = Optional<RolSicap, 'corr_rol'>;

export class RolSicapModel extends Model<RolSicap, RolSicapCreation> implements RolSicap {
  declare corr_rol: number;
  declare nom_rol: string | null;
  declare est_rol: string | null;
}

RolSicapModel.init(
  {
    corr_rol: { type: DataTypes.INTEGER, primaryKey: true },
    nom_rol: DataTypes.STRING,
    est_rol: DataTypes.STRING,
  },
  { sequelize, tableName: 'roles', schema: 'dbo', timestamps: false }
);
