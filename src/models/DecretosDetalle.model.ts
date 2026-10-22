import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface DecretoDetalle {
  fol_dec: string;
  corr_mar: number | null;
  corr_detmar: number | null;
  mon_decdet: string | number | null;
  sublinea: string | null;
}

export class DecretosDetalleModel extends Model<DecretoDetalle> implements DecretoDetalle {
  declare fol_dec: string;
  declare corr_mar: number | null;
  declare corr_detmar: number | null;
  declare mon_decdet: string | number | null;
  declare sublinea: string | null;
}

DecretosDetalleModel.init({
  fol_dec: DataTypes.STRING,
  corr_mar: DataTypes.INTEGER,
  corr_detmar: DataTypes.INTEGER,
  mon_decdet: DataTypes.DECIMAL,
  sublinea: DataTypes.STRING,
}, { sequelize, tableName: 'DECDET', schema: 'dbo', timestamps: false });

// La consulta legacy no define una clave de detalle; el modelo es solo de lectura.
DecretosDetalleModel.removeAttribute('id');
