import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { DocumentoStatus } from './DocReemplazoBenProyecto.model';

export interface DocumentoAuditoria {
  id: number;
  RUT: number;
  dv: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  ong: string;
  idComuna: number;
  idRegion: number;
  certCotizacionesUrl: string;
  liquidacionUrl: string;
  certCotizacionesNombre: string;
  liquidacionNombre: string;
  estadoCert: DocumentoStatus;
  estadoLiquidacion: DocumentoStatus;
  comentarioCert: string | null;
  comentarioLiquidacion: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_usr: number;
  updated_usr: number;
  deleted_usr: number | null;
}

type Creation = Optional<DocumentoAuditoria,
  'id' | 'estadoCert' | 'estadoLiquidacion' | 'comentarioCert' | 'comentarioLiquidacion' |
  'created_at' | 'updated_at' | 'deleted_at' | 'deleted_usr'>;

export class DocumentoAuditoriaModel extends Model<DocumentoAuditoria, Creation> {
  declare id: number;
  declare idRegion: number;
  declare certCotizacionesUrl: string;
  declare liquidacionUrl: string;
  declare certCotizacionesNombre: string;
  declare liquidacionNombre: string;
  declare estadoCert: DocumentoStatus;
  declare estadoLiquidacion: DocumentoStatus;
}

DocumentoAuditoriaModel.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  RUT: { type: DataTypes.INTEGER, allowNull: false },
  dv: { type: DataTypes.STRING(1), allowNull: false },
  nombres: { type: DataTypes.STRING(255), allowNull: false },
  apellidoPaterno: { type: DataTypes.STRING(255), allowNull: false },
  apellidoMaterno: { type: DataTypes.STRING(255), allowNull: false },
  ong: { type: DataTypes.STRING(255), allowNull: false },
  idComuna: { type: DataTypes.INTEGER, allowNull: false },
  idRegion: { type: DataTypes.INTEGER, allowNull: false },
  certCotizacionesUrl: { type: DataTypes.STRING(500), allowNull: false },
  liquidacionUrl: { type: DataTypes.STRING(500), allowNull: false },
  certCotizacionesNombre: { type: DataTypes.STRING(255), allowNull: false },
  liquidacionNombre: { type: DataTypes.STRING(255), allowNull: false },
  estadoCert: {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente',
    validate: { isIn: [['pendiente', 'rechazado', 'aprobado']] },
  },
  estadoLiquidacion: {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente',
    validate: { isIn: [['pendiente', 'rechazado', 'aprobado']] },
  },
  comentarioCert: { type: DataTypes.STRING(1000), allowNull: true },
  comentarioLiquidacion: { type: DataTypes.STRING(1000), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
  deleted_at: { type: DataTypes.DATE, allowNull: true },
  created_usr: { type: DataTypes.INTEGER, allowNull: false },
  updated_usr: { type: DataTypes.INTEGER, allowNull: false },
  deleted_usr: { type: DataTypes.INTEGER, allowNull: true },
}, {
  sequelize, tableName: 'documentos_auditoria', schema: 'dbo',
  timestamps: true, paranoid: true,
  createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
});
