import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Condoc } from './Condoc.model';

// Continuación de dbo.CONDOC: mismas columnas y tipos; aquí se crean los
// documentos nuevos y se modifica su estado. Sin FK ni índices adicionales.
export class CondocProempleoModel extends Model<Condoc> implements Condoc {
  declare id_condoc: number;
  declare fol_condoc: string | null;
  declare cod_ano: number | null;
  declare corr_mar: number | null;
  declare tip_condoc: string | null;
  declare cod_are: number | null;
  declare des_condoc: string | null;
  declare ant_condoc: string | null;
  declare est_condoc: string | null;
  declare fec_cre: Date | null;
  declare usu_cre: string | null;
  declare fec_mod: Date | null;
  declare usu_mod: string | null;
  declare fec_eli: Date | null;
  declare usu_eli: string | null;
  declare Fol_pro: string | null;
  declare fec_pro: Date | null;
  declare usu_pro: string | null;
}

CondocProempleoModel.init({
  id_condoc: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fol_condoc: { type: 'CHAR(8)', allowNull: false },
  cod_ano: { type: DataTypes.INTEGER, allowNull: false },
  corr_mar: { type: DataTypes.INTEGER, allowNull: false },
  tip_condoc: { type: 'VARCHAR(50)', allowNull: false },
  cod_are: { type: DataTypes.INTEGER, allowNull: false },
  des_condoc: { type: 'VARCHAR(250)', allowNull: false },
  ant_condoc: { type: 'VARCHAR(250)', allowNull: true },
  est_condoc: { type: 'VARCHAR(50)', allowNull: false },
  fec_cre: { type: 'DATETIME', allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_mod: { type: 'DATETIME', allowNull: true },
  usu_mod: { type: 'VARCHAR(50)', allowNull: true },
  fec_eli: { type: 'DATETIME', allowNull: true },
  usu_eli: { type: 'VARCHAR(50)', allowNull: true },
  Fol_pro: { type: 'VARCHAR(50)', allowNull: true },
  fec_pro: { type: 'DATETIME', allowNull: true },
  usu_pro: { type: 'VARCHAR(50)', allowNull: true },
}, { sequelize, tableName: 'condoc_proempleo', schema: 'dbo', timestamps: false });
