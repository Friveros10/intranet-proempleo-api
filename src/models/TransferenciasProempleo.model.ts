import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { atributosTransferencia, type Transferencia } from './Transferencias.model';

export interface TransferenciaProempleo extends Transferencia {
  id: number;
}

export class TransferenciasProempleoModel extends Model<TransferenciaProempleo, Optional<TransferenciaProempleo, 'id'>> {}

TransferenciasProempleoModel.init({
  ...atributosTransferencia,
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  ordinario: { type: 'VARCHAR(50)', allowNull: false },
  folio: { type: DataTypes.INTEGER, allowNull: false },
  correlativo: { type: DataTypes.INTEGER, allowNull: false },
  monto: { type: 'NUMERIC(18,0)', allowNull: false },
  estado: { type: 'VARCHAR(50)', allowNull: false },
  ingreso: { type: 'DATETIME', allowNull: false },
  ultimo_usuario: { type: 'VARCHAR(50)', allowNull: false },
  ultima_actualizacion: { type: 'DATETIME', allowNull: false },
  fol_dec: { type: 'CHAR(8)', allowNull: false },
}, { sequelize, schema: 'dbo', tableName: 'transferencias_proempleo', timestamps: false });
