import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { AuditEstadoNotificacion, AuditLog } from './AuditLog';

type AuditLogCreation = Optional<
  AuditLog,
  | 'id'
  | 'registroId'
  | 'region'
  | 'detalle'
  | 'fecha'
  | 'ip'
  | 'userAgent'
  | 'estadoAdmin'
  | 'estadoMinisterio'
  | 'estadoIntendencia'
  | 'fechaVistaAdmin'
  | 'fechaVistaMinisterio'
  | 'fechaVistaIntendencia'
>;

export class AuditLogModel extends Model<AuditLog, AuditLogCreation> implements AuditLog {
  declare id: number;
  declare usuarioId: number | null;
  declare accion: AuditLog['accion'];
  declare modulo: string;
  declare entidad: string;
  declare registroId: string | null;
  declare region: number | null;
  declare fecha: string;
  declare ip: string | null;
  declare userAgent: string | null;
  declare detalle: string | null;
  declare estadoAdmin: AuditEstadoNotificacion;
  declare estadoMinisterio: AuditEstadoNotificacion;
  declare estadoIntendencia: AuditEstadoNotificacion;
  declare fechaVistaAdmin: string | null;
  declare fechaVistaMinisterio: string | null;
  declare fechaVistaIntendencia: string | null;
}

AuditLogModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuarioId: { type: DataTypes.INTEGER, allowNull: true },
    accion: { type: DataTypes.STRING(60), allowNull: false },
    modulo: { type: DataTypes.STRING(80), allowNull: false },
    entidad: { type: DataTypes.STRING(80), allowNull: false },
    registroId: { type: DataTypes.STRING(80), allowNull: true },
    region: { type: DataTypes.INTEGER, allowNull: true },
    detalle: { type: DataTypes.TEXT, allowNull: true },
    fecha: { type: DataTypes.DATE, allowNull: false },
    ip: { type: DataTypes.STRING(80), allowNull: true },
    userAgent: { type: DataTypes.STRING(255), allowNull: true },
    estadoAdmin: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'vista']] },
    },
    estadoMinisterio: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'vista']] },
    },
    estadoIntendencia: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'vista']] },
    },
    fechaVistaAdmin: { type: DataTypes.DATE, allowNull: true },
    fechaVistaMinisterio: { type: DataTypes.DATE, allowNull: true },
    fechaVistaIntendencia: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'audits_log', schema: 'dbo', timestamps: false }
);