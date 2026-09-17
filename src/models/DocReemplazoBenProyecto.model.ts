import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { DocReemplazoBenProyecto, DocumentoStatus } from './DocReemplazoBenProyecto';

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
    fechaCarga: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'Doc_reemplazo_benpro', schema: 'dbo', timestamps: false }
);
