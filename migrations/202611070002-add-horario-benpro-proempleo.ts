import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

const table = { tableName: 'benpro_proempleo', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  const [columna] = await queryInterface.sequelize.query<{ existe: number }>(`
    SELECT COUNT(*) AS existe FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='benpro_proempleo' AND COLUMN_NAME='horario_benpro'
  `, { type: QueryTypes.SELECT });
  if (!columna?.existe) {
    await queryInterface.addColumn(table, 'horario_benpro', {
      type: DataTypes.STRING(200), allowNull: true,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn(table, 'horario_benpro');
}
