import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn(
    { tableName: 'BENEFICIARIOS', schema: 'dbo' },
    'status',
    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  );
  await queryInterface.addColumn(
    { tableName: 'BENEFICIARIOS', schema: 'dbo' },
    'statusFicha',
    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn({ tableName: 'BENEFICIARIOS', schema: 'dbo' }, 'statusFicha');
  await queryInterface.removeColumn({ tableName: 'BENEFICIARIOS', schema: 'dbo' }, 'status');
}