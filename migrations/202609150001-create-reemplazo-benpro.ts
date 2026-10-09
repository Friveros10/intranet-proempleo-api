import { DataTypes, QueryInterface } from 'sequelize';

// Tabla propia del módulo de reemplazos. Se crea con su esquema final.
//
// No declara claves foráneas hacia tablas legacy (BENEFICIARIOS, PROYECTOS,
// Usuario): el beneficiario puede existir solo en dbo.beneficiarios_proempleo y
// el solicitante vive en dbo.users_proempleo. La integridad se valida en la
// capa de aplicación, igual que en los modelos Sequelize.
const table = { tableName: 'Reemplazo_benpro', schema: 'dbo' };

function criterio() {
  return { type: DataTypes.INTEGER, allowNull: true };
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(table, {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    idBeneficiarioProyecto: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    idBeneficiarioNuevo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idProyecto: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rutUsuarioSolicitante: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    comentarioRechazo: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    fechaSolicitudReemplazo: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fechaAprobacionReemplazo: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    criterio_1: criterio(),
    criterio_2: criterio(),
    criterio_3: criterio(),
    criterio_4: criterio(),
    criterio_5: criterio(),
    ponderacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    puntajeRsh: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(table);
}
