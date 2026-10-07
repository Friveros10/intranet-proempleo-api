import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { RegionModel } from './Region.model';
import { CiudadModel } from './Ciudad.model';
import { ComunaModel } from './Comuna.model';

export interface BeneficiarioConsulta {
  rut_ben: number;
  dig_ben: string | null;
  nom_ben: string | null;
  pat_ben: string | null;
  mat_ben: string | null;
  dir_ben: string | null;
  reg_ben: number | null;
  ciu_ben: number | null;
  com_ben: number | null;
  civ_ben: number | null;
  fecnac_ben: string | null;
  sex_ben: string | null;
  est_ben: string | null;
  etn_ben: string | null;
  tel_ben: string | null;
  cel_ben: string | null;
  email_ben: string | null;
  status: number;
  statusFicha: number;
  origen: 'historico' | 'proempleo';
}

function rechazarEscritura(): never {
  throw new Error('La vista beneficiarios_consulta es de solo lectura');
}

export class BeneficiarioConsultaModel extends Model<BeneficiarioConsulta> {
  declare region?: RegionModel | null;
  declare ciudad?: CiudadModel | null;
  declare comuna?: ComunaModel | null;
}

BeneficiarioConsultaModel.init(
  {
    rut_ben: { type: DataTypes.INTEGER, primaryKey: true },
    origen: { type: DataTypes.STRING(10), primaryKey: true },
    dig_ben: DataTypes.STRING,
    nom_ben: DataTypes.STRING,
    pat_ben: DataTypes.STRING,
    mat_ben: DataTypes.STRING,
    dir_ben: DataTypes.STRING,
    reg_ben: DataTypes.INTEGER,
    ciu_ben: DataTypes.INTEGER,
    com_ben: DataTypes.INTEGER,
    civ_ben: DataTypes.INTEGER,
    fecnac_ben: DataTypes.STRING(10),
    sex_ben: DataTypes.STRING,
    est_ben: DataTypes.STRING,
    etn_ben: DataTypes.STRING,
    tel_ben: DataTypes.STRING,
    cel_ben: DataTypes.STRING,
    email_ben: DataTypes.STRING,
    status: DataTypes.INTEGER,
    statusFicha: DataTypes.INTEGER,
  },
  {
    sequelize, tableName: 'beneficiarios_consulta', schema: 'dbo', timestamps: false,
    hooks: {
      beforeSave: rechazarEscritura,
      beforeBulkCreate: rechazarEscritura,
      beforeBulkUpdate: rechazarEscritura,
      beforeBulkDestroy: rechazarEscritura,
      beforeDestroy: rechazarEscritura,
      beforeUpsert: rechazarEscritura,
    },
  },
);
