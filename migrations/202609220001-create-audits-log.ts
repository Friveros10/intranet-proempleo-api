import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(
    { tableName: 'audits_log', schema: 'dbo' },
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      accion: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      modulo: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      entidad: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      registroId: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      region: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      detalle: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      ip: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      estadoAdmin: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      estadoMinisterio: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      estadoIntendencia: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      fechaVistaAdmin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fechaVistaMinisterio: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fechaVistaIntendencia: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }
  );

  await queryInterface.addIndex({ tableName: 'audits_log', schema: 'dbo' }, ['fecha']);
  await queryInterface.addIndex({ tableName: 'audits_log', schema: 'dbo' }, ['region']);
  await queryInterface.addIndex({ tableName: 'audits_log', schema: 'dbo' }, ['estadoAdmin']);
  await queryInterface.addIndex({ tableName: 'audits_log', schema: 'dbo' }, ['estadoMinisterio']);
  await queryInterface.addIndex({ tableName: 'audits_log', schema: 'dbo' }, ['estadoIntendencia']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable({ tableName: 'audits_log', schema: 'dbo' });
}