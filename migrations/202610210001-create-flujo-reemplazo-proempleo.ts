import { DataTypes, QueryInterface } from "sequelize";

const flujo = { tableName: "flujo_reemplazo_proempleo", schema: "dbo" };
const solicitudes = { tableName: "reemplazo_individual_proempleo", schema: "dbo" };
const documentos = { tableName: "documento_reemplazo_individual_proempleo", schema: "dbo" };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(flujo, {
      idRegion: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    }, { transaction });
    await queryInterface.addConstraint(flujo, {
      fields: ["status"], type: "check", where: { status: [0, 1] },
      name: "CK_flujo_reemplazo_proempleo_status", transaction,
    });
    await queryInterface.createTable(solicitudes, {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idBeneficiarioProyecto: { type: DataTypes.INTEGER, allowNull: true },
      idBeneficiarioNuevo: { type: DataTypes.INTEGER, allowNull: false },
      idProyecto: { type: DataTypes.INTEGER, allowNull: false },
      rutUsuarioSolicitante: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente" },
      comentarioRechazo: { type: DataTypes.STRING(1000), allowNull: true },
      fechaSolicitudReemplazo: { type: DataTypes.DATE, allowNull: false },
      fechaAprobacionReemplazo: { type: DataTypes.DATE, allowNull: true },
      criterio_1: { type: DataTypes.INTEGER, allowNull: true },
      criterio_2: { type: DataTypes.INTEGER, allowNull: true },
      criterio_3: { type: DataTypes.INTEGER, allowNull: true },
      criterio_4: { type: DataTypes.INTEGER, allowNull: true },
      criterio_5: { type: DataTypes.INTEGER, allowNull: true },
      ponderacion: { type: DataTypes.INTEGER, allowNull: true },
      puntajeRsh: { type: DataTypes.INTEGER, allowNull: true },
    }, { transaction });
    await queryInterface.createTable(documentos, {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idReemplazoBenProyecto: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: solicitudes, key: "id" }, onDelete: "CASCADE",
      },
      idDocumento: { type: DataTypes.INTEGER, allowNull: false },
      idBeneficiario: { type: DataTypes.INTEGER, allowNull: false },
      nombreArchivo: { type: DataTypes.STRING, allowNull: false },
      archivoUrl: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente" },
      comentarioRechazo: { type: DataTypes.STRING(1000), allowNull: true },
      fechaCarga: { type: DataTypes.DATE, allowNull: false },
    }, { transaction });
    await queryInterface.addIndex(documentos, ["idReemplazoBenProyecto", "idDocumento"], {
      unique: true, name: "UQ_documento_reemplazo_individual_tipo", transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable(documentos, { transaction });
    await queryInterface.dropTable(solicitudes, { transaction });
    await queryInterface.dropTable(flujo, { transaction });
  });
}
