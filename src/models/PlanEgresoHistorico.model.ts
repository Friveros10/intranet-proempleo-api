import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface PlanEgresoHistorico {
  RUN: number;
  RUT: string | null;
  NOMBRES: string | null;
  APELLIDO_PAT: string | null;
  APELLIDO_MAT: string | null;
  COMUNA: string | null;
  REGION: string | null;
  PROGRAMA: string | null;
  PLAN_EGRESO: string | null;
  anio: number | null;
  RESOLUCION: string | null;
  ESTADO: string | null;
  FECHAREV: Date | null;
}

export class PlanEgresoHistoricoModel
  extends Model<PlanEgresoHistorico>
  implements PlanEgresoHistorico
{
  declare RUN: number;
  declare RUT: string | null;
  declare NOMBRES: string | null;
  declare APELLIDO_PAT: string | null;
  declare APELLIDO_MAT: string | null;
  declare COMUNA: string | null;
  declare REGION: string | null;
  declare PROGRAMA: string | null;
  declare PLAN_EGRESO: string | null;
  declare anio: number | null;
  declare RESOLUCION: string | null;
  declare ESTADO: string | null;
  declare FECHAREV: Date | null;
}

PlanEgresoHistoricoModel.init(
  {
    RUN: DataTypes.INTEGER,
    RUT: DataTypes.STRING,
    NOMBRES: DataTypes.STRING,
    APELLIDO_PAT: DataTypes.STRING,
    APELLIDO_MAT: DataTypes.STRING,
    COMUNA: DataTypes.STRING,
    REGION: DataTypes.STRING,
    PROGRAMA: DataTypes.STRING,
    PLAN_EGRESO: DataTypes.STRING,
    anio: { type: DataTypes.INTEGER, field: 'AÑO' },
    RESOLUCION: DataTypes.STRING,
    ESTADO: DataTypes.STRING,
    FECHAREV: DataTypes.DATE,
  },
  { sequelize, tableName: 'PlanEgresoHistorico', schema: 'dbo', timestamps: false }
);

PlanEgresoHistoricoModel.removeAttribute('id');
