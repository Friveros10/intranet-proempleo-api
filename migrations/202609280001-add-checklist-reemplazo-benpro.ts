import { DataTypes, QueryInterface } from 'sequelize';

const TABLA = { tableName: 'Reemplazo_benpro', schema: 'dbo' };
const COLUMNAS = ['criterio_1', 'criterio_2', 'criterio_3', 'criterio_4', 'criterio_5', 'ponderacion'];

export async function up(queryInterface: QueryInterface): Promise<void> {
  for (const columna of COLUMNAS) {
    await queryInterface.addColumn(TABLA, columna, { type: DataTypes.INTEGER, allowNull: true });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  for (const columna of [...COLUMNAS].reverse()) {
    await queryInterface.removeColumn(TABLA, columna);
  }
}
