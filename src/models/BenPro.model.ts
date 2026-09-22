import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface BenPro {
  ano_BenPro: number;
  mes_benpro: number;
  fol_pro: number;
  rut_ben: number;
  com_ben: number | null;
  cor_benpro: number;
  est_benpro: string | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  key_imp: string | null;
  usu_imp: string | null;
  fec_imp: Date | null;
  usu_apr: string | null;
  fec_apr: Date | null;
  sit_benpro: string | null;
  sit_fec: Date | null;
  sit_usu: string | null;
  dir_benpro: string | null;
  usu_mod: string | null;
  fec_mod: Date | null;
}

export class BenProModel extends Model<BenPro, BenPro> implements BenPro {
  declare ano_BenPro: number;
  declare mes_benpro: number;
  declare fol_pro: number;
  declare rut_ben: number;
  declare com_ben: number | null;
  declare cor_benpro: number;
  declare est_benpro: string | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare key_imp: string | null;
  declare usu_imp: string | null;
  declare fec_imp: Date | null;
  declare usu_apr: string | null;
  declare fec_apr: Date | null;
  declare sit_benpro: string | null;
  declare sit_fec: Date | null;
  declare sit_usu: string | null;
  declare dir_benpro: string | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
}

BenProModel.init(
  {
    ano_BenPro: { type: DataTypes.INTEGER, primaryKey: true },
    mes_benpro: { type: DataTypes.INTEGER, primaryKey: true },
    fol_pro: { type: DataTypes.INTEGER, primaryKey: true },
    rut_ben: { type: DataTypes.INTEGER, primaryKey: true },
    com_ben: DataTypes.INTEGER,
    cor_benpro: { type: DataTypes.INTEGER, primaryKey: true },
    est_benpro: DataTypes.STRING,
    usu_cre: DataTypes.STRING,
    fec_cre: DataTypes.DATE,
    usu_eli: DataTypes.STRING,
    fec_eli: DataTypes.DATE,
    key_imp: DataTypes.STRING,
    usu_imp: DataTypes.STRING,
    fec_imp: DataTypes.DATE,
    usu_apr: DataTypes.STRING,
    fec_apr: DataTypes.DATE,
    sit_benpro: DataTypes.STRING,
    sit_fec: DataTypes.DATE,
    sit_usu: DataTypes.STRING,
    dir_benpro: DataTypes.STRING,
    usu_mod: DataTypes.STRING,
    fec_mod: DataTypes.DATE,
  },
  { sequelize, tableName: 'BENPRO', schema: 'dbo', timestamps: false }
);