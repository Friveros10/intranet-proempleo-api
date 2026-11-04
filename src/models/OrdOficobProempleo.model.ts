import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { OrdOficob } from './OrdOficob.model';

// Continuación de dbo.ORDOFICOB: mismas columnas y tipos, más cod_region
// (la región queda fija en el ordinario nuevo). Sin FK ni índices adicionales.
export interface OrdOficobProempleo extends OrdOficob {
  cod_region: number;
}

export class OrdOficobProempleoModel extends Model<OrdOficobProempleo> implements OrdOficobProempleo {
  declare ord_ofi: string;
  declare cod_region: number;
  declare fec_ofi: Date | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
}

OrdOficobProempleoModel.init({
  ord_ofi: { type: 'CHAR(10)', primaryKey: true },
  cod_region: { type: DataTypes.INTEGER, allowNull: false },
  fec_ofi: { type: 'DATETIME', allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
}, { sequelize, tableName: 'ordOficob_proempleo', schema: 'dbo', timestamps: false });
