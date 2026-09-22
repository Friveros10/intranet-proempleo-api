import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { ProyectoModel } from './Proyecto.model';

export type ReemplazoStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface ReemplazoBenProyecto {
  id: number;
  idBeneficiarioProyecto: number;
  idBeneficiarioNuevo: number;
  idProyecto: number;
  rutUsuarioSolicitante: number | null;
  status: ReemplazoStatus;
  fechaSolicitudReemplazo: string;
  fechaAprobacionReemplazo: string | null;
}

type ReemplazoCreation = Optional<ReemplazoBenProyecto, 'id' | 'fechaAprobacionReemplazo'>;

export class ReemplazoBenProyectoModel
  extends Model<ReemplazoBenProyecto, ReemplazoCreation>
  implements ReemplazoBenProyecto
{
  declare id: number;
  declare idBeneficiarioProyecto: number; //beneficiario antiguo rut
  declare idBeneficiarioNuevo: number; //beneficiario nuevo rut
  declare idProyecto: number; //proyecto fol_pro
  declare rutUsuarioSolicitante: number | null; //rut de quien creó la solicitud
  declare status: ReemplazoStatus;
  declare fechaSolicitudReemplazo: string;
  declare fechaAprobacionReemplazo: string | null;
  // Asociación cargada solo cuando se hace include: [{ model: ProyectoModel, as: 'proyecto' }]
  declare proyecto?: ProyectoModel;
}

ReemplazoBenProyectoModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idBeneficiarioProyecto: { type: DataTypes.INTEGER, allowNull: false },
    idBeneficiarioNuevo: { type: DataTypes.INTEGER, allowNull: false },
    idProyecto: { type: DataTypes.INTEGER, allowNull: false },
    rutUsuarioSolicitante: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'aprobado', 'rechazado']] },
    },
    fechaSolicitudReemplazo: { type: DataTypes.DATE, allowNull: false },
    fechaAprobacionReemplazo: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'Reemplazo_benpro', schema: 'dbo', timestamps: false }
);
