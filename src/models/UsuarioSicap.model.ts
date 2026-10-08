import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface UsuarioSicap {
  rut_usu: number;
  log_usu: string;
  dig_usu: string;
  niv_usu: number | null;
  nom_usu: string;
  pat_usu: string;
  cla_usu: string;
  mat_usu: string | null;
  dir_usu: string | null;
  reg_usu: number | null;
  ciu_usu: number | null;
  com_usu: number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  corr_rol: number | null;
  ema_usu: string | null;
  cla2_usu: Buffer | null;
  est_usu: string | null;
  fec_cad_pass: Date | null;
}

export type UsuarioSicapSafe = Omit<UsuarioSicap, 'cla_usu' | 'cla2_usu'>;

export function toSafeUsuarioSicap(usuario: UsuarioSicap): UsuarioSicapSafe {
  const { cla_usu, cla2_usu, ...safe } = usuario;
  return safe;
}

type UsuarioSicapCreation = Optional<UsuarioSicap,
  'niv_usu' | 'mat_usu' | 'dir_usu' | 'reg_usu' | 'ciu_usu' | 'com_usu' |
  'usu_cre' | 'fec_cre' | 'usu_mod' | 'fec_mod' | 'usu_eli' | 'fec_eli' |
  'corr_rol' | 'ema_usu' | 'cla2_usu' | 'est_usu' | 'fec_cad_pass'
>;

export class UsuarioSicapModel extends Model<UsuarioSicap, UsuarioSicapCreation> implements UsuarioSicap {
  declare rut_usu: number;
  declare log_usu: string;
  declare dig_usu: string;
  declare niv_usu: number | null;
  declare nom_usu: string;
  declare pat_usu: string;
  declare cla_usu: string;
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
  declare cla2_usu: Buffer | null;
  declare est_usu: string | null;
  declare fec_cad_pass: Date | null;
}

UsuarioSicapModel.init(
  {
    rut_usu: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    log_usu: { type: 'VARCHAR(50)', allowNull: false },
    dig_usu: { type: 'VARCHAR(1)', allowNull: false },
    niv_usu: { type: DataTypes.INTEGER, allowNull: true },
    nom_usu: { type: 'VARCHAR(50)', allowNull: false },
    pat_usu: { type: 'VARCHAR(50)', allowNull: false },
    cla_usu: { type: 'VARCHAR(50)', allowNull: false },
    mat_usu: { type: 'VARCHAR(50)', allowNull: true },
    dir_usu: { type: 'VARCHAR(50)', allowNull: true },
    reg_usu: { type: DataTypes.INTEGER, allowNull: true },
    ciu_usu: { type: DataTypes.INTEGER, allowNull: true },
    com_usu: { type: DataTypes.INTEGER, allowNull: true },
    usu_cre: { type: 'VARCHAR(50)', allowNull: true },
    fec_cre: { type: 'DATETIME', allowNull: true },
    usu_mod: { type: 'VARCHAR(50)', allowNull: true },
    fec_mod: { type: 'DATETIME', allowNull: true },
    usu_eli: { type: 'VARCHAR(50)', allowNull: true },
    fec_eli: { type: 'DATETIME', allowNull: true },
    corr_rol: { type: DataTypes.INTEGER, allowNull: true },
    ema_usu: { type: 'VARCHAR(50)', allowNull: true },
    cla2_usu: { type: 'VARBINARY(MAX)', allowNull: true },
    est_usu: { type: 'VARCHAR(15)', allowNull: true },
    fec_cad_pass: { type: 'DATETIME', allowNull: true },
  },
  { sequelize, tableName: 'users_proempleo', schema: 'dbo', timestamps: false }
);