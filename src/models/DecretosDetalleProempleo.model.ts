import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { DecretoDetalle } from './DecretosDetalle.model';

export class DecretosDetalleProempleoModel extends Model<DecretoDetalle> {}

DecretosDetalleProempleoModel.init({
  fol_dec: { type: 'CHAR(8)', allowNull: false },
  corr_mar: { type: DataTypes.INTEGER, allowNull: false },
  corr_detmar: { type: DataTypes.INTEGER, allowNull: false },
  mon_decdet: 'NUMERIC(18,0)',
  sublinea: 'VARCHAR(20)',
}, { sequelize, schema: 'dbo', tableName: 'decretosDetalle_proempleo', timestamps: false });
DecretosDetalleProempleoModel.removeAttribute('id');
