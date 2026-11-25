import { DataTypes, Model, type ModelAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface DetReintegro {
  corr_detrei: number;
  mes_detrei: number;
  ano_detrei: number;
  fol_dec: string;
  fol_pro: number;
  mon_detrei: string;
  che_detrei: string;
  fecche_detrei: Date | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_eli: Date | null;
  est_detrei: string | null;
  cod_region: number | null;
  mem_detrei: string | null;
  fecmem_detrei: Date | null;
  ord_detrei: string | null;
  fecord_detrei: Date | null;
}

export const atributosDetReintegro = {
  corr_detrei: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  mes_detrei: { type: DataTypes.INTEGER, allowNull: false },
  ano_detrei: { type: DataTypes.INTEGER, allowNull: false },
  fol_dec: { type: 'CHAR(8)', allowNull: false },
  fol_pro: { type: DataTypes.INTEGER, allowNull: false },
  mon_detrei: { type: 'NUMERIC(18,0)', allowNull: false },
  che_detrei: { type: 'VARCHAR(25)', allowNull: false },
  fecche_detrei: { type: 'DATETIME', allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
  usu_mod: { type: 'VARCHAR(50)', allowNull: true },
  fec_eli: { type: 'DATETIME', allowNull: true },
  est_detrei: { type: 'VARCHAR(50)', allowNull: true },
  cod_region: { type: DataTypes.INTEGER, allowNull: true },
  mem_detrei: { type: 'VARCHAR(8)', allowNull: true },
  fecmem_detrei: { type: 'DATETIME', allowNull: true },
  ord_detrei: { type: 'VARCHAR(8)', allowNull: true },
  fecord_detrei: { type: 'DATETIME', allowNull: true },
} satisfies ModelAttributes<Model<DetReintegro>, DetReintegro>;

export class DetReintegroModel extends Model<DetReintegro> {}
DetReintegroModel.init(atributosDetReintegro, {
  sequelize, schema: 'dbo', tableName: 'DETREINTEGRO', timestamps: false,
});
