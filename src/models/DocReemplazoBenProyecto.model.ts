import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

export type DocumentoStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface DocReemplazoBenProyecto {
  id: number;
  idReemplazoBenProyecto: number;
  idDocumento: number;
  idBeneficiario: number;
  nombreArchivo: string;
  archivoUrl: string;
  status: DocumentoStatus;
  comentarioRechazo: string | null;
  fechaCarga: string;
}

type DocReemplazoCreation = Optional<DocReemplazoBenProyecto, 'id'>;

export class DocReemplazoBenProyectoModel
  extends Model<DocReemplazoBenProyecto, DocReemplazoCreation>
  implements DocReemplazoBenProyecto
{
  declare id: number;
  declare idReemplazoBenProyecto: number;
  declare idDocumento: number;
  declare idBeneficiario: number;
  declare nombreArchivo: string;
  declare archivoUrl: string;
  declare status: DocumentoStatus;
  declare comentarioRechazo: string | null;
  declare fechaCarga: string;
}

DocReemplazoBenProyectoModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idReemplazoBenProyecto: { type: DataTypes.INTEGER, allowNull: false },
    idDocumento: { type: DataTypes.INTEGER, allowNull: false },
    idBeneficiario: { type: DataTypes.INTEGER, allowNull: false },
    nombreArchivo: { type: DataTypes.STRING, allowNull: false },
    archivoUrl: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'aprobado', 'rechazado']] },
    },
    comentarioRechazo: { type: DataTypes.STRING(1000), allowNull: true },
    fechaCarga: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'Doc_reemplazo_benpro', schema: 'dbo', timestamps: false }
);
