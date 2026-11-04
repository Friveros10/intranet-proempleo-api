import { Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Modelo completo de la tabla legacy dbo.ORDOFICOB (solo lectura).
// Cabecera de los ordinarios de cobertura. No escribir ni alterar esta tabla.
export interface OrdOficob {
  ord_ofi: string;
  fec_ofi: Date | null;
  usu_cre: string | null;
  fec_cre: Date | null;
}

export class OrdOficobModel extends Model<OrdOficob> implements OrdOficob {
  declare ord_ofi: string;
  declare fec_ofi: Date | null;
  declare usu_cre: string | null;
  declare fec_cre: Date | null;
}

OrdOficobModel.init({
  ord_ofi: { type: 'CHAR(10)', primaryKey: true },
  fec_ofi: { type: 'DATETIME', allowNull: true },
  usu_cre: { type: 'VARCHAR(50)', allowNull: true },
  fec_cre: { type: 'DATETIME', allowNull: true },
}, { sequelize, tableName: 'ORDOFICOB', schema: 'dbo', timestamps: false });
