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
  comentarioRechazo: string | null;
  fechaSolicitudReemplazo: string;
  fechaAprobacionReemplazo: string | null;
  criterio_1: number | null;
  criterio_2: number | null;
  criterio_3: number | null;
  criterio_4: number | null;
  criterio_5: number | null;
  ponderacion: number | null;
}

type ReemplazoCreation = Optional<
  ReemplazoBenProyecto,
  | 'id'
  | 'fechaAprobacionReemplazo'
  | 'comentarioRechazo'
  | 'criterio_1'
  | 'criterio_2'
  | 'criterio_3'
  | 'criterio_4'
  | 'criterio_5'
  | 'ponderacion'
>;

const criterioAttribute = {
  type: DataTypes.INTEGER,
  allowNull: true,
  validate: { isInt: true, min: 0, max: 10 },
};

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
  declare comentarioRechazo: string | null;
  declare fechaSolicitudReemplazo: string;
  declare fechaAprobacionReemplazo: string | null;
  declare criterio_1: number | null;
  declare criterio_2: number | null;
  declare criterio_3: number | null;
  declare criterio_4: number | null;
  declare criterio_5: number | null;
  declare ponderacion: number | null;
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
    comentarioRechazo: { type: DataTypes.STRING(1000), allowNull: true },
    fechaSolicitudReemplazo: { type: DataTypes.DATE, allowNull: false },
    fechaAprobacionReemplazo: { type: DataTypes.DATE, allowNull: true },
    criterio_1: criterioAttribute,
    criterio_2: criterioAttribute,
    criterio_3: criterioAttribute,
    criterio_4: criterioAttribute,
    criterio_5: criterioAttribute,
    ponderacion: { type: DataTypes.INTEGER, allowNull: true, validate: { isInt: true } },
  },
  { sequelize, tableName: 'Reemplazo_benpro', schema: 'dbo', timestamps: false }
);
