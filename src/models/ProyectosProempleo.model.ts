import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Continuación de dbo.PROYECTOS: mismas columnas con los tipos reales de SQL
// Server, más banco_pro (referencia al catálogo estático Banco_proyectos,
// diferencia aprobada). Aquí se crean, editan y eliminan (lógico) los proyectos
// nuevos; la tabla original permanece de solo lectura.
export interface ProyectoProempleo {
  fol_pro: number;
  nom_pro: string;
  rutint_pro: number;
  ruteje_pro: number;
  reg_pro: number;
  ciu_pro: number;
  obj_pro: string | null;
  imp_pro: string | null;
  obs_pro: string | null;
  mes_pro: number | null;
  emp_pro: number | null;
  fecini_pro: Date | null;
  fecter_pro: Date | null;
  rutres_pro: number | null;
  fec_pro: Date | null;
  carres_pro: string | null;
  faxres_pro: number | null;
  emares_pro: string | null;
  subtitulo_mar: number;
  item_mar: number;
  linea_mar: number;
  glo_detmar: number | null;
  corr_mar: number;
  corr_detmar: number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  est_pro: string | null;
  mon_pro: string | null;
  jor_pro: string | null;
  com_pro: number | null;
  folext_pro: string | null;
  ano_pro: number | null;
  key_imp: string | null;
  usu_imp: string | null;
  fec_imp: Date | null;
  usu_apr: string | null;
  fec_apr: Date | null;
  otroemp_pro: number | null;
  usu_act: string | null;
  fec_act: Date | null;
  usu_rech: string | null;
  fec_rech: Date | null;
  EstApr_pro: string | null;
  Dir_pro: string | null;
  Latitud: number | null;
  Longitud: number | null;
  banco_pro: number | null;
}

export class ProyectosProempleoModel extends Model<ProyectoProempleo> implements ProyectoProempleo {
  declare fol_pro: number;
  declare nom_pro: string;
  declare rutint_pro: number;
  declare ruteje_pro: number;
  declare reg_pro: number;
  declare ciu_pro: number;
  declare obj_pro: string | null;
  declare imp_pro: string | null;
  declare obs_pro: string | null;
  declare mes_pro: number | null;
  declare emp_pro: number | null;
  declare fecini_pro: Date | null;
  declare fecter_pro: Date | null;
  declare rutres_pro: number | null;
  declare fec_pro: Date | null;
  declare carres_pro: string | null;
  declare faxres_pro: number | null;
  declare emares_pro: string | null;
  declare subtitulo_mar: number;
  declare item_mar: number;
  declare linea_mar: number;
  declare glo_detmar: number | null;
  declare corr_mar: number;
  declare corr_detmar: number | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
  declare usu_mod: string | null;
  declare fec_mod: Date | null;
  declare usu_eli: string | null;
  declare fec_eli: Date | null;
  declare est_pro: string | null;
  declare mon_pro: string | null;
  declare jor_pro: string | null;
  declare com_pro: number | null;
  declare folext_pro: string | null;
  declare ano_pro: number | null;
  declare key_imp: string | null;
  declare usu_imp: string | null;
  declare fec_imp: Date | null;
  declare usu_apr: string | null;
  declare fec_apr: Date | null;
  declare otroemp_pro: number | null;
  declare usu_act: string | null;
  declare fec_act: Date | null;
  declare usu_rech: string | null;
  declare fec_rech: Date | null;
  declare EstApr_pro: string | null;
  declare Dir_pro: string | null;
  declare Latitud: number | null;
  declare Longitud: number | null;
  declare banco_pro: number | null;
}

ProyectosProempleoModel.init({
  fol_pro: { type: DataTypes.INTEGER, primaryKey: true },
  nom_pro: { type: 'VARCHAR(300)', allowNull: false },
  rutint_pro: { type: DataTypes.INTEGER, allowNull: false },
  ruteje_pro: { type: DataTypes.INTEGER, allowNull: false },
  reg_pro: { type: DataTypes.INTEGER, allowNull: false },
  ciu_pro: { type: DataTypes.INTEGER, allowNull: false },
  obj_pro: { type: 'VARCHAR(200)', allowNull: true },
  imp_pro: { type: 'VARCHAR(200)', allowNull: true },
  obs_pro: { type: 'VARCHAR(200)', allowNull: true },
  mes_pro: { type: DataTypes.INTEGER, allowNull: true },
  emp_pro: { type: DataTypes.INTEGER, allowNull: true },
  fecini_pro: { type: 'DATETIME', allowNull: true },
  fecter_pro: { type: 'DATETIME', allowNull: true },
  rutres_pro: { type: DataTypes.INTEGER, allowNull: true },
  fec_pro: { type: 'DATETIME', allowNull: true },
  carres_pro: { type: 'VARCHAR(50)', allowNull: true },
  faxres_pro: { type: DataTypes.INTEGER, allowNull: true },
  emares_pro: { type: 'VARCHAR(50)', allowNull: true },
  subtitulo_mar: { type: DataTypes.INTEGER, allowNull: false },
  item_mar: { type: DataTypes.INTEGER, allowNull: false },
  linea_mar: { type: DataTypes.INTEGER, allowNull: false },
  glo_detmar: { type: DataTypes.INTEGER, allowNull: true },
  corr_mar: { type: DataTypes.INTEGER, allowNull: false },
  corr_detmar: { type: DataTypes.INTEGER, allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
  usu_mod: { type: 'VARCHAR(50)', allowNull: true },
  fec_mod: { type: 'DATETIME', allowNull: true },
  usu_eli: { type: 'VARCHAR(50)', allowNull: true },
  fec_eli: { type: 'DATETIME', allowNull: true },
  est_pro: { type: 'VARCHAR(50)', allowNull: true },
  mon_pro: { type: 'NUMERIC(18,0)', allowNull: true },
  jor_pro: { type: 'VARCHAR(15)', allowNull: true },
  com_pro: { type: DataTypes.INTEGER, allowNull: true },
  folext_pro: { type: 'VARCHAR(15)', allowNull: true },
  ano_pro: { type: DataTypes.INTEGER, allowNull: true },
  key_imp: { type: 'VARCHAR(8)', allowNull: true },
  usu_imp: { type: 'VARCHAR(50)', allowNull: true },
  fec_imp: { type: 'DATETIME', allowNull: true },
  usu_apr: { type: 'VARCHAR(50)', allowNull: true },
  fec_apr: { type: 'DATETIME', allowNull: true },
  otroemp_pro: { type: DataTypes.INTEGER, allowNull: true },
  usu_act: { type: 'VARCHAR(50)', allowNull: true },
  fec_act: { type: 'DATETIME', allowNull: true },
  usu_rech: { type: 'VARCHAR(20)', allowNull: true },
  fec_rech: { type: 'DATETIME', allowNull: true },
  EstApr_pro: { type: 'VARCHAR(15)', allowNull: true },
  Dir_pro: { type: 'VARCHAR(100)', allowNull: true },
  Latitud: { type: DataTypes.FLOAT, allowNull: true },
  Longitud: { type: DataTypes.FLOAT, allowNull: true },
  banco_pro: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'proyectos_proempleo', schema: 'dbo', timestamps: false });
