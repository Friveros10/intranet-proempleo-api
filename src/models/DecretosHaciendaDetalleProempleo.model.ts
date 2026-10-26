import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { DecretoHaciendaDetalle } from './DecretosHaciendaDetalle.model';
import type { OrigenMarco } from '../validations/marco.validation';

export interface DecretoHaciendaDetalleProempleo extends DecretoHaciendaDetalle {
  origen_mar: OrigenMarco;
  glosa_dethac: string;
}

export class DecretosHaciendaDetalleProempleoModel extends Model<
  DecretoHaciendaDetalleProempleo, Optional<DecretoHaciendaDetalleProempleo, 'corr_dethac'>
> {}

DecretosHaciendaDetalleProempleoModel.init({
  fol_dechac: { type: 'VARCHAR(50)', primaryKey: true, allowNull: false },
  corr_dethac: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  corr_mar: { type: DataTypes.INTEGER, allowNull: false },
  corr_detmar: DataTypes.INTEGER,
  acc_dethac: { type: 'VARCHAR(50)', allowNull: false },
  mon_dethac: { type: 'NUMERIC(18,0)', allowNull: false },
  origen_mar: { type: 'VARCHAR(10)', allowNull: false },
  glosa_dethac: { type: 'VARCHAR(50)', allowNull: false },
}, { sequelize, schema: 'dbo', tableName: 'detdechacienda_proempleo', timestamps: false });
