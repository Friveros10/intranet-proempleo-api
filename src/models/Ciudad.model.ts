import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Ciudad {
  cod_ciu: number;
  cod_reg: number | null;
  nom_ciu: string | null;
  est_ciu: string | null;
  cap_ciu: string | null;
}

type CiudadCreation = Optional<Ciudad, 'cod_ciu'>;

export class CiudadModel extends Model<Ciudad, CiudadCreation> implements Ciudad {
  declare cod_ciu: number;
  declare cod_reg: number | null;
  declare nom_ciu: string | null;
  declare est_ciu: string | null;
  declare cap_ciu: string | null;
}

CiudadModel.init(
  {
    cod_ciu: { type: DataTypes.INTEGER, primaryKey: true },
    cod_reg: DataTypes.INTEGER,
    nom_ciu: DataTypes.STRING,
    est_ciu: DataTypes.STRING,
    cap_ciu: DataTypes.STRING,
  },
  { sequelize, tableName: 'CIUDADES', schema: 'dbo', timestamps: false }
);