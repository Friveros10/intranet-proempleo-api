import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Region {
  cod_region: number;
  Glo_region: string | null;
  Nom_region: string | null;
  est_region: string | null;
}

type RegionCreation = Optional<Region, 'cod_region'>;

export class RegionModel extends Model<Region, RegionCreation> implements Region {
  declare cod_region: number;
  declare Glo_region: string | null;
  declare Nom_region: string | null;
  declare est_region: string | null;
}

RegionModel.init(
  {
    cod_region: { type: DataTypes.INTEGER, primaryKey: true },
    Glo_region: DataTypes.STRING,
    Nom_region: DataTypes.STRING,
    est_region: DataTypes.STRING,
  },
  { sequelize, tableName: 'REGIONES', schema: 'dbo', timestamps: false }
);