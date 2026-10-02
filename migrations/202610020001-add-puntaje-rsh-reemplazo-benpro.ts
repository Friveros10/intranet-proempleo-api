import { DataTypes, QueryInterface } from 'sequelize';

const TABLA = { tableName: 'Reemplazo_benpro', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn(TABLA, 'puntajeRsh', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn(TABLA, 'puntajeRsh');
}