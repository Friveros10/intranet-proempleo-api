import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Modelo completo de la tabla legacy dbo.OFICIOCOB (solo lectura).
// No escribir, sincronizar ni alterar esta tabla.
export interface OficioCobertura {
  corr_ofi: number;
  ord_ofi: string | null;
  CORR_MAR: number | null;
  Mes_ofi: number | null;
  ano_ofi: number | null;
  cod_reg: number | null;
  cod_ciu: number | null;
  cod_com: number | null;
  jor_ofi: string | null;
  tip_ofi: string | null;
  ben_ofi: number | null;
  mon_ofi: string | number | null;
}

export class OficioCoberturaModel extends Model<OficioCobertura> implements OficioCobertura {
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

OficioCoberturaModel.init({
  corr_ofi: { type: DataTypes.INTEGER, primaryKey: true },
  ord_ofi: { type: 'CHAR(10)', allowNull: true },
  CORR_MAR: { type: DataTypes.INTEGER, allowNull: true },
  Mes_ofi: { type: DataTypes.INTEGER, allowNull: true },
  ano_ofi: { type: DataTypes.INTEGER, allowNull: true },
  cod_reg: { type: DataTypes.INTEGER, allowNull: true },
  cod_ciu: { type: DataTypes.INTEGER, allowNull: true },
  cod_com: { type: DataTypes.INTEGER, allowNull: true },
  jor_ofi: { type: 'VARCHAR(50)', allowNull: true },
  tip_ofi: { type: 'VARCHAR(50)', allowNull: true },
  ben_ofi: { type: DataTypes.INTEGER, allowNull: true },
  mon_ofi: { type: 'NUMERIC(18,0)', allowNull: true },
}, { sequelize, tableName: 'OFICIOCOB', schema: 'dbo', timestamps: false });
