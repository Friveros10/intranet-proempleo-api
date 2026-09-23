import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Comuna {
  cod_com: number;
  cod_ciu: number | null;
  nom_com: string | null;
  est_com: string | null;
  latitud: number | null;
  longitud: number | null;
}

type ComunaCreation = Optional<Comuna, 'cod_com'>;

export class ComunaModel extends Model<Comuna, ComunaCreation> implements Comuna {
  declare cod_com: number;
  declare cod_ciu: number | null;
  declare nom_com: string | null;
  declare est_com: string | null;
  declare latitud: number | null;
  declare longitud: number | null;
}

ComunaModel.init(
  {
    cod_com: { type: DataTypes.INTEGER, primaryKey: true },
    cod_ciu: DataTypes.INTEGER,
    nom_com: DataTypes.STRING,
    est_com: DataTypes.STRING,
    latitud: DataTypes.FLOAT,
    longitud: DataTypes.FLOAT,
  },
  { sequelize, tableName: 'COMUNAS', schema: 'dbo', timestamps: false }
);