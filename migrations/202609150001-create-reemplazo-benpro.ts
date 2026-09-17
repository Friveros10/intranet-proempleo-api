import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(
    { tableName: 'Reemplazo_benpro', schema: 'dbo' },
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      idBeneficiarioProyecto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'BENEFICIARIOS', schema: 'dbo' }, key: 'rut_ben' },
      },
      idBeneficiarioNuevo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'BENEFICIARIOS', schema: 'dbo' }, key: 'rut_ben' },
      },
      idProyecto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'PROYECTOS', schema: 'dbo' }, key: 'fol_pro' },
      },
      rutUsuarioSolicitante: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: { tableName: 'Usuario', schema: 'dbo' }, key: 'rut_usu' },
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
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
    }
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable({ tableName: 'Reemplazo_benpro', schema: 'dbo' });
}