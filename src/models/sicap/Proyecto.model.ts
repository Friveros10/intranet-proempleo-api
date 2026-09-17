import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import { Proyecto } from './Proyecto';

type ProyectoCreation = Optional<Proyecto, 'fol_pro'>;

export class ProyectoModel extends Model<Proyecto, ProyectoCreation> implements Proyecto {
  declare fol_pro: number;
  declare nom_pro: string | null;
  declare rutint_pro: string | null;
  declare ruteje_pro: string | null;
  declare reg_pro: number | null;
  declare ciu_pro: number | null;
  declare obj_pro: string | null;
  declare imp_pro: number | null;
  declare obs_pro: string | null;
  declare mes_pro: number | null;
  declare emp_pro: number | null;
  declare fecini_pro: Date | null;
  declare fecter_pro: Date | null;
  declare rutres_pro: string | null;
  declare fec_pro: Date | null;
  declare carres_pro: string | null;
  declare faxres_pro: string | null;
  declare emares_pro: string | null;
  declare subtitulo_mar: string | null;
  declare item_mar: string | null;
  declare linea_mar: string | null;
  declare glo_detmar: string | null;
  declare corr_mar: number | null;
  declare corr_detmar: number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare est_pro: string | null;
  declare mon_pro: number | null;
  declare jor_pro: number | null;
  declare com_pro: number | null;
  declare folext_pro: string | null;
  declare ano_pro: number | null;
  declare key_imp: string | null;
  declare usu_imp: string | null;
  declare fec_imp: Date | null;
  declare usu_apr: string | null;
  declare fec_apr: Date | null;
  declare otroemp_pro: string | null;
  declare usu_act: string | null;
  declare fec_act: Date | null;
  declare usu_rech: string | null;
  declare fec_rech: Date | null;
  declare EstApr_pro: string | null;
  declare Dir_pro: string | null;
  declare Latitud: number | null;
  declare Longitud: number | null;
}

ProyectoModel.init(
  {
    fol_pro: { type: DataTypes.INTEGER, primaryKey: true },
    nom_pro: DataTypes.STRING,
    rutint_pro: DataTypes.STRING,
    ruteje_pro: DataTypes.STRING,
    reg_pro: DataTypes.INTEGER,
    ciu_pro: DataTypes.INTEGER,
    obj_pro: DataTypes.STRING,
    imp_pro: DataTypes.INTEGER,
    obs_pro: DataTypes.STRING,
    mes_pro: DataTypes.INTEGER,
    emp_pro: DataTypes.INTEGER,
    fecini_pro: DataTypes.DATE,
    fecter_pro: DataTypes.DATE,
    rutres_pro: DataTypes.STRING,
    fec_pro: DataTypes.DATE,
    carres_pro: DataTypes.STRING,
    faxres_pro: DataTypes.STRING,
    emares_pro: DataTypes.STRING,
    subtitulo_mar: DataTypes.STRING,
    item_mar: DataTypes.STRING,
    linea_mar: DataTypes.STRING,
    glo_detmar: DataTypes.STRING,
    corr_mar: DataTypes.INTEGER,
    corr_detmar: DataTypes.INTEGER,
    usu_cre: DataTypes.STRING,
    fec_cre: DataTypes.DATE,
    usu_mod: DataTypes.STRING,
    fec_mod: DataTypes.DATE,
    usu_eli: DataTypes.STRING,
    fec_eli: DataTypes.DATE,
    est_pro: DataTypes.STRING,
    mon_pro: DataTypes.INTEGER,
    jor_pro: DataTypes.INTEGER,
    com_pro: DataTypes.INTEGER,
    folext_pro: DataTypes.STRING,
    ano_pro: DataTypes.INTEGER,
    key_imp: DataTypes.STRING,
    usu_imp: DataTypes.STRING,
    fec_imp: DataTypes.DATE,
    usu_apr: DataTypes.STRING,
    fec_apr: DataTypes.DATE,
    otroemp_pro: DataTypes.STRING,
    usu_act: DataTypes.STRING,
    fec_act: DataTypes.DATE,
    usu_rech: DataTypes.STRING,
    fec_rech: DataTypes.DATE,
    EstApr_pro: DataTypes.STRING,
    Dir_pro: DataTypes.STRING,
    Latitud: DataTypes.FLOAT,
    Longitud: DataTypes.FLOAT,
  },
  { sequelize, tableName: 'PROYECTOS', schema: 'dbo', timestamps: false }
);
