import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Menu {
  corr_men: number;
  cod_men: string | null;
  Nom_men: string | null;
  Tip_men: string | null;
  acc_men: string | null;
  tar_men: string | null;
  imagen: string | null;
  target_net: string | null;
  id_tip: number | null;
  url_net: string | null;
  url_spe: string | null;
  asp: string | null;
}

type MenuCreation = Optional<Menu, 'corr_men'>;

export class MenuModel extends Model<Menu, MenuCreation> implements Menu {
  declare corr_men: number;
  declare cod_men: string | null;
  declare Nom_men: string | null;
  declare Tip_men: string | null;
  declare acc_men: string | null;
  declare tar_men: string | null;
  declare imagen: string | null;
  declare target_net: string | null;
  declare id_tip: number | null;
  declare url_net: string | null;
  declare url_spe: string | null;
  declare asp: string | null;
}

MenuModel.init(
  {
    corr_men: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cod_men: DataTypes.STRING,
    Nom_men: DataTypes.STRING,
    Tip_men: DataTypes.STRING,
    acc_men: DataTypes.STRING,
    tar_men: DataTypes.STRING,
    imagen: DataTypes.STRING,
    target_net: DataTypes.STRING,
    id_tip: DataTypes.INTEGER,
    url_net: DataTypes.STRING,
    url_spe: DataTypes.STRING,
    asp: DataTypes.STRING,
  },
  { sequelize, tableName: 'menus', schema: 'dbo', timestamps: false }
);