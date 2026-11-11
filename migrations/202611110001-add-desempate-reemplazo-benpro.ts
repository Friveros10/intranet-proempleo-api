import { DataTypes, QueryInterface } from 'sequelize';

const table = { tableName: 'Reemplazo_benpro', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn(table, 'desempate', {
    type: DataTypes.STRING(50),
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn(table, 'desempate');
}
