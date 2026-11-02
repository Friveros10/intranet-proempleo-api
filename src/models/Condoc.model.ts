import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Modelo completo de la tabla legacy dbo.CONDOC (solo lectura).
// No escribir, sincronizar ni alterar esta tabla.
export interface Condoc {
  id_condoc: number;
  fol_condoc: string | null;
  cod_ano: number | null;
  corr_mar: number | null;
  tip_condoc: string | null;
  cod_are: number | null;
  des_condoc: string | null;
  ant_condoc: string | null;
  est_condoc: string | null;
  fec_cre: Date | null;
  usu_cre: string | null;
  fec_mod: Date | null;
  usu_mod: string | null;
  fec_eli: Date | null;
  usu_eli: string | null;
  Fol_pro: string | null;
  fec_pro: Date | null;
  usu_pro: string | null;
}

export class CondocModel extends Model<Condoc> implements Condoc {
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

CondocModel.init({
  id_condoc: { type: DataTypes.INTEGER, primaryKey: true },
  fol_condoc: { type: 'CHAR(8)', allowNull: true },
  cod_ano: { type: DataTypes.INTEGER, allowNull: true },
  corr_mar: { type: DataTypes.INTEGER, allowNull: true },
  tip_condoc: { type: 'VARCHAR(50)', allowNull: true },
  cod_are: { type: DataTypes.INTEGER, allowNull: true },
  des_condoc: { type: 'VARCHAR(250)', allowNull: true },
  ant_condoc: { type: 'VARCHAR(250)', allowNull: true },
  est_condoc: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_mod: { type: 'DATETIME', allowNull: true },
  usu_mod: { type: 'VARCHAR(50)', allowNull: true },
  fec_eli: { type: 'DATETIME', allowNull: true },
  usu_eli: { type: 'VARCHAR(50)', allowNull: true },
  Fol_pro: { type: 'VARCHAR(50)', allowNull: true },
  fec_pro: { type: 'DATETIME', allowNull: true },
  usu_pro: { type: 'VARCHAR(50)', allowNull: true },
}, { sequelize, tableName: 'CONDOC', schema: 'dbo', timestamps: false });
