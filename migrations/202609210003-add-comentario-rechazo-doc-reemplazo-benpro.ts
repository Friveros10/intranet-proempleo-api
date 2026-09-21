import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn(
    { tableName: 'Doc_reemplazo_benpro', schema: 'dbo' },
    'comentarioRechazo',
    {
      type: DataTypes.STRING(1000),
      allowNull: true,
    }
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn(
    { tableName: 'Doc_reemplazo_benpro', schema: 'dbo' },
    'comentarioRechazo'
  );
}
