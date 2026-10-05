import { DataTypes, QueryInterface } from 'sequelize';

// Nueva tabla propia de beneficiarios ProEmpleo. Solo contiene los campos que la
// aplicación usa actualmente, con nombres descriptivos. Los registros nuevos se
// crean aquí; la tabla legacy dbo.BENEFICIARIOS queda en modo solo-lectura.
const table = { tableName: 'beneficiarios_proempleo', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(table, {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    rutBeneficiario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    digitoVerificador: {
      type: DataTypes.STRING(1),
      allowNull: true,
    },
    nombres: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    apellidoPaterno: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    apellidoMaterno: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    idRegion: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    idCiudad: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    idComuna: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fechaNacimiento: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sexo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nivelEducacional: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    etnia: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    usuarioCreacion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fechaCreacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usuarioModificacion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fechaModificacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usuarioEliminacion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fechaEliminacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    statusFicha: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(table);
}
