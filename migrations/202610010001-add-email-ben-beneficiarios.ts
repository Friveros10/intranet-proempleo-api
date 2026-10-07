import { DataTypes, QueryInterface } from 'sequelize';

const table = { tableName: 'BENEFICIARIOS', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  // await queryInterface.addColumn(table, 'email_ben', {
  //   type: DataTypes.STRING,
  //   allowNull: true,
  // });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // await queryInterface.removeColumn(table, 'email_ben');
}