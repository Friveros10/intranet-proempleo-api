import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import { UsuarioSicap } from './UsuarioSicap';

type UsuarioSicapCreation = Optional<UsuarioSicap, 'rut_usu'>;

export class UsuarioSicapModel extends Model<UsuarioSicap, UsuarioSicapCreation> implements UsuarioSicap {
  declare rut_usu: number;
  declare log_usu: string | null;
  declare dig_usu: string | null;
  declare niv_usu: string | null;
  declare nom_usu: string | null;
  declare pat_usu: string | null;
  declare cla_usu: string | null;
  declare mat_usu: string | null;
  declare dir_usu: string | null;
  declare reg_usu: number | null;
  declare ciu_usu: number | null;
  declare com_usu: number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare corr_rol: number | null;
  declare ema_usu: string | null;
  declare cla2_usu: string | null;
  declare est_usu: string | null;
  declare fec_cad_pass: Date | null;
}

UsuarioSicapModel.init(
  {
    rut_usu: { type: DataTypes.INTEGER, primaryKey: true },
    log_usu: DataTypes.STRING,
    dig_usu: DataTypes.STRING,
    niv_usu: DataTypes.STRING,
    nom_usu: DataTypes.STRING,
    pat_usu: DataTypes.STRING,
    cla_usu: DataTypes.STRING,
    mat_usu: DataTypes.STRING,
    dir_usu: DataTypes.STRING,
    reg_usu: DataTypes.INTEGER,
    ciu_usu: DataTypes.INTEGER,
    com_usu: DataTypes.INTEGER,
    usu_cre: DataTypes.STRING,
    fec_cre: DataTypes.DATE,
    usu_mod: DataTypes.STRING,
    fec_mod: DataTypes.DATE,
    usu_eli: DataTypes.STRING,
    fec_eli: DataTypes.DATE,
    corr_rol: DataTypes.INTEGER,
    ema_usu: DataTypes.STRING,
    cla2_usu: DataTypes.STRING,
    est_usu: DataTypes.STRING,
    fec_cad_pass: DataTypes.DATE,
  },
  { sequelize, tableName: 'Usuario', schema: 'dbo', timestamps: false }
);
