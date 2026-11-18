import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { OrdOficob } from './OrdOficob.model';

// Continuación de dbo.ORDOFICOB: mismas columnas y tipos, más cod_region
// (la región queda fija en el ordinario nuevo). Sin FK ni índices adicionales.
export interface OrdOficobProempleo extends OrdOficob {
  cod_region: number;
  ano_ofi: number | null;
  mes_desde: number | null;
  mes_hasta: number | null;
}

export class OrdOficobProempleoModel extends Model<OrdOficobProempleo> implements OrdOficobProempleo {
  declare ord_ofi: string;
  declare cod_region: number;
  declare ano_ofi: number | null;
  declare mes_desde: number | null;
  declare mes_hasta: number | null;
  declare fec_ofi: Date | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
}

OrdOficobProempleoModel.init({
  ord_ofi: { type: 'CHAR(10)', primaryKey: true },
  cod_region: { type: DataTypes.INTEGER, allowNull: false },
  ano_ofi: DataTypes.INTEGER,
  mes_desde: DataTypes.INTEGER,
  mes_hasta: DataTypes.INTEGER,
  fec_ofi: { type: 'DATETIME', allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
}, { sequelize, tableName: 'ordOficob_proempleo', schema: 'dbo', timestamps: false });
