import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Intermediario {
  rut_int: number;
  dig_int: string | null;
  nom_int: string | null;
  reg_int: number | null;
}

export class IntermediarioModel extends Model<Intermediario> implements Intermediario {
  declare rut_int: number;
  declare dig_int: string | null;
  declare nom_int: string | null;
  declare reg_int: number | null;
}

IntermediarioModel.init({
  rut_int: { type: DataTypes.INTEGER, primaryKey: true },
  dig_int: DataTypes.STRING,
  nom_int: DataTypes.STRING,
  reg_int: DataTypes.INTEGER,
}, { sequelize, tableName: 'INTERMEDIARIOS', schema: 'dbo', timestamps: false });
