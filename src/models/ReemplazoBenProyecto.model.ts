import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { BeneficiarioModel } from './Beneficiario.model';
import { ProyectoModel } from './Proyecto.model';
import {
  CRITERIO_VALOR_MAX,
  CRITERIO_VALOR_MIN,
} from '../constants/checklist.constants';

export type ReemplazoStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'enRevision' | 'revisado';

export interface ReemplazoBenProyecto {
  id: number;
  idBeneficiarioProyecto: number | null;
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
  puntajeRsh: number | null;
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
  | 'puntajeRsh'
>;

function crearCriterioAttribute() {
  return {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      isInt: true,
      min: CRITERIO_VALOR_MIN,
      max: CRITERIO_VALOR_MAX,
    },
  };
}

export class ReemplazoBenProyectoModel
  extends Model<ReemplazoBenProyecto, ReemplazoCreation>
  implements ReemplazoBenProyecto
{
  declare id: number;
  declare idBeneficiarioProyecto: number | null; // nulo para cupos de cobertura
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
  declare puntajeRsh: number | null;
  declare beneficiarioNuevo?: BeneficiarioModel;
  // Asociación cargada solo cuando se hace include: [{ model: ProyectoModel, as: 'proyecto' }]
  declare proyecto?: ProyectoModel;
}

ReemplazoBenProyectoModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idBeneficiarioProyecto: { type: DataTypes.INTEGER, allowNull: true },
    idBeneficiarioNuevo: { type: DataTypes.INTEGER, allowNull: false },
    idProyecto: { type: DataTypes.INTEGER, allowNull: false },
    rutUsuarioSolicitante: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'aprobado', 'rechazado', 'enRevision', 'revisado']] },
    },
    comentarioRechazo: { type: DataTypes.STRING(1000), allowNull: true },
    fechaSolicitudReemplazo: { type: DataTypes.DATE, allowNull: false },
    fechaAprobacionReemplazo: { type: DataTypes.DATE, allowNull: true },
    criterio_1: crearCriterioAttribute(),
    criterio_2: crearCriterioAttribute(),
    criterio_3: crearCriterioAttribute(),
    criterio_4: crearCriterioAttribute(),
    criterio_5: crearCriterioAttribute(),
    ponderacion: { type: DataTypes.INTEGER, allowNull: true, validate: { isInt: true } },
    puntajeRsh: { type: DataTypes.INTEGER, allowNull: true, validate: { isInt: true } },
  },
  { sequelize, tableName: 'Reemplazo_benpro', schema: 'dbo', timestamps: false }
);
