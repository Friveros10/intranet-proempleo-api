import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';

// Modelo de la nueva tabla propia beneficiarios_proempleo. Contiene solo los
// campos que la aplicación usa actualmente, con nombres descriptivos. Los
// registros nuevos de beneficiarios se crean aquí; la tabla legacy
// dbo.BENEFICIARIOS queda en modo solo-lectura.
export interface BeneficiarioProempleo {
  id: number;
  rutBeneficiario: number;
  digitoVerificador: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  direccion: string | null;
  idRegion: number | null;
  idCiudad: number | null;
  idComuna: number | null;
  fechaNacimiento: Date | null;
  sexo: string | null;
  nivelEducacional: string | null;
  etnia: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  usuarioCreacion: string | null;
  fechaCreacion: Date | null;
  usuarioModificacion: string | null;
  fechaModificacion: Date | null;
  usuarioEliminacion: string | null;
  fechaEliminacion: Date | null;
  status: number;
  statusFicha: number;
}

type BeneficiarioProempleoCreation = Optional<BeneficiarioProempleo, 'id'>;

export class BeneficiarioProempleoModel
  extends Model<BeneficiarioProempleo, BeneficiarioProempleoCreation>
  implements BeneficiarioProempleo
{
  declare id: number;
  declare rutBeneficiario: number;
  declare digitoVerificador: string | null;
  declare nombres: string | null;
  declare apellidoPaterno: string | null;
  declare apellidoMaterno: string | null;
  declare direccion: string | null;
  declare idRegion: number | null;
  declare idCiudad: number | null;
  declare idComuna: number | null;
  declare fechaNacimiento: Date | null;
  declare sexo: string | null;
  declare nivelEducacional: string | null;
  declare etnia: string | null;
  declare telefono: string | null;
  declare celular: string | null;
  declare email: string | null;
  declare usuarioCreacion: string | null;
  declare fechaCreacion: Date | null;
  declare usuarioModificacion: string | null;
  declare fechaModificacion: Date | null;
  declare usuarioEliminacion: string | null;
  declare fechaEliminacion: Date | null;
  declare status: number;
  declare statusFicha: number;
}

BeneficiarioProempleoModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    rutBeneficiario: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    digitoVerificador: DataTypes.STRING(1),
    nombres: DataTypes.STRING,
    apellidoPaterno: DataTypes.STRING,
    apellidoMaterno: DataTypes.STRING,
    direccion: DataTypes.STRING,
    idRegion: DataTypes.INTEGER,
    idCiudad: DataTypes.INTEGER,
    idComuna: DataTypes.INTEGER,
    fechaNacimiento: DataTypes.DATE,
    sexo: DataTypes.STRING,
    nivelEducacional: DataTypes.STRING(255),
    etnia: DataTypes.STRING,
    telefono: DataTypes.STRING,
    celular: DataTypes.STRING,
    email: DataTypes.STRING,
    usuarioCreacion: DataTypes.STRING,
    fechaCreacion: DataTypes.DATE,
    usuarioModificacion: DataTypes.STRING,
    fechaModificacion: DataTypes.DATE,
    usuarioEliminacion: DataTypes.STRING,
    fechaEliminacion: DataTypes.DATE,
    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    statusFicha: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  },
  { sequelize, tableName: 'beneficiarios_proempleo', schema: 'dbo', timestamps: false }
);
