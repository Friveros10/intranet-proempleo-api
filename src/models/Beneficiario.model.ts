import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface Beneficiario {
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
  nac_ben: number | null;
  fecnac_ben: Date | null;
  tra_ben: string | null;
  car_ben: string | null;
  sex_ben: string | null;
  jefhog_ben: string | null;
  nivedu_ben: number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  est_ben: string | null;
  etn_ben: number | null;
  idchs_ben: string | null;
  dis_ben: string | null;
  aredes_ben: string | null;
  pan_ben: string | null;
  con_ben: string | null;
  peninh_ben: string | null;
  cerdes_ben: string | null;
  eda_ben: number | null;
  chs_ben: string | null;
  idcerdes_ben: string | null;
  cod_RC: string | null;
  fec_RC: Date | null;
  usu_apr: string | null;
  fec_apr: Date | null;
  usu_imp: string | null;
  fec_imp: Date | null;
  key_imp: string | null;
  fm_ben: string | null;
  fs_ben: string | null;
  tel_ben: string | null;
  ano_ben: number | null;
  corr_mar: number | null;
  cod_cel_ben: string | null;
  cel_ben: string | null;
  cod_tel_ben: string | null;
  tip_mar: string | null;
  telrec_ben: string | null;
  codtelrec_ben: string | null;
}

type BeneficiarioCreation = Optional<Beneficiario, 'rut_ben'>;

export class BeneficiarioModel extends Model<Beneficiario, BeneficiarioCreation> implements Beneficiario {
  declare rut_ben: number;
  declare dig_ben: string | null;
  declare nom_ben: string | null;
  declare pat_ben: string | null;
  declare mat_ben: string | null;
  declare dir_ben: string | null;
  declare reg_ben: number | null;
  declare ciu_ben: number | null;
  declare com_ben: number | null;
  declare civ_ben: number | null;
  declare nac_ben: number | null;
  declare fecnac_ben: Date | null;
  declare tra_ben: string | null;
  declare car_ben: string | null;
  declare sex_ben: string | null;
  declare jefhog_ben: string | null;
  declare nivedu_ben: number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare est_ben: string | null;
  declare etn_ben: number | null;
  declare idchs_ben: string | null;
  declare dis_ben: string | null;
  declare aredes_ben: string | null;
  declare pan_ben: string | null;
  declare con_ben: string | null;
  declare peninh_ben: string | null;
  declare cerdes_ben: string | null;
  declare eda_ben: number | null;
  declare chs_ben: string | null;
  declare idcerdes_ben: string | null;
  declare cod_RC: string | null;
  declare fec_RC: Date | null;
  declare usu_apr: string | null;
  declare fec_apr: Date | null;
  declare usu_imp: string | null;
  declare fec_imp: Date | null;
  declare key_imp: string | null;
  declare fm_ben: string | null;
  declare fs_ben: string | null;
  declare tel_ben: string | null;
  declare ano_ben: number | null;
  declare corr_mar: number | null;
  declare cod_cel_ben: string | null;
  declare cel_ben: string | null;
  declare cod_tel_ben: string | null;
  declare tip_mar: string | null;
  declare telrec_ben: string | null;
  declare codtelrec_ben: string | null;
}

BeneficiarioModel.init(
  {
    rut_ben: { type: DataTypes.INTEGER, primaryKey: true },
    dig_ben: DataTypes.STRING,
    nom_ben: DataTypes.STRING,
    pat_ben: DataTypes.STRING,
    mat_ben: DataTypes.STRING,
    dir_ben: DataTypes.STRING,
    reg_ben: DataTypes.INTEGER,
    ciu_ben: DataTypes.INTEGER,
    com_ben: DataTypes.INTEGER,
    civ_ben: DataTypes.INTEGER,
    nac_ben: DataTypes.INTEGER,
    fecnac_ben: DataTypes.DATE,
    tra_ben: DataTypes.STRING,
    car_ben: DataTypes.STRING,
    sex_ben: DataTypes.STRING,
    jefhog_ben: DataTypes.STRING,
    nivedu_ben: DataTypes.INTEGER,
    usu_cre: DataTypes.STRING,
    fec_cre: DataTypes.DATE,
    usu_mod: DataTypes.STRING,
    fec_mod: DataTypes.DATE,
    usu_eli: DataTypes.STRING,
    fec_eli: DataTypes.DATE,
    est_ben: DataTypes.STRING,
    etn_ben: DataTypes.INTEGER,
    idchs_ben: DataTypes.STRING,
    dis_ben: DataTypes.STRING,
    aredes_ben: DataTypes.STRING,
    pan_ben: DataTypes.STRING,
    con_ben: DataTypes.STRING,
    peninh_ben: DataTypes.STRING,
    cerdes_ben: DataTypes.STRING,
    eda_ben: DataTypes.INTEGER,
    chs_ben: DataTypes.STRING,
    idcerdes_ben: DataTypes.STRING,
    cod_RC: DataTypes.STRING,
    fec_RC: DataTypes.DATE,
    usu_apr: DataTypes.STRING,
    fec_apr: DataTypes.DATE,
    usu_imp: DataTypes.STRING,
    fec_imp: DataTypes.DATE,
    key_imp: DataTypes.STRING,
    fm_ben: DataTypes.STRING,
    fs_ben: DataTypes.STRING,
    tel_ben: DataTypes.STRING,
    ano_ben: DataTypes.INTEGER,
    corr_mar: DataTypes.INTEGER,
    cod_cel_ben: DataTypes.STRING,
    cel_ben: DataTypes.STRING,
    cod_tel_ben: DataTypes.STRING,
    tip_mar: DataTypes.STRING,
    telrec_ben: DataTypes.STRING,
    codtelrec_ben: DataTypes.STRING,
  },
  { sequelize, tableName: 'BENEFICIARIOS', schema: 'dbo', timestamps: false }
);