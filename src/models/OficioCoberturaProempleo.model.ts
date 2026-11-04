import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { OficioCobertura } from './OficioCobertura.model';

// Continuación de dbo.OFICIOCOB: mismas columnas y tipos; aquí se crean las
// coberturas nuevas. corr_ofi es IDENTITY con semilla sobre el máximo legacy,
// de modo que ambas tablas funcionan como una sola sin repetir correlativos.
// Sin FK ni índices adicionales.
export class OficioCoberturaProempleoModel extends Model<OficioCobertura> implements OficioCobertura {
  declare corr_ofi: number;
  declare ord_ofi: string | null;
  declare CORR_MAR: number | null;
  declare Mes_ofi: number | null;
  declare ano_ofi: number | null;
  declare cod_reg: number | null;
  declare cod_ciu: number | null;
  declare cod_com: number | null;
  declare jor_ofi: string | null;
  declare tip_ofi: string | null;
  declare ben_ofi: number | null;
  declare mon_ofi: string | number | null;
}

OficioCoberturaProempleoModel.init({
  corr_ofi: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ord_ofi: { type: 'CHAR(10)', allowNull: false },
  CORR_MAR: { type: DataTypes.INTEGER, allowNull: false },
  Mes_ofi: { type: DataTypes.INTEGER, allowNull: false },
  ano_ofi: { type: DataTypes.INTEGER, allowNull: false },
  cod_reg: { type: DataTypes.INTEGER, allowNull: false },
  cod_ciu: { type: DataTypes.INTEGER, allowNull: false },
  cod_com: { type: DataTypes.INTEGER, allowNull: false },
  jor_ofi: { type: 'VARCHAR(50)', allowNull: false },
  tip_ofi: { type: 'VARCHAR(50)', allowNull: false },
  ben_ofi: { type: DataTypes.INTEGER, allowNull: false },
  mon_ofi: { type: 'NUMERIC(18,0)', allowNull: false },
}, { sequelize, tableName: 'oficiocob_proempleo', schema: 'dbo', timestamps: false });
