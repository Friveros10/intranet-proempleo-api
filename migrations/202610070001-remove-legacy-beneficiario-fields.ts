import { DataTypes, QueryInterface } from 'sequelize';

const table = { tableName: 'BENEFICIARIOS', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  // await queryInterface.sequelize.transaction(async (transaction) => {
  //   const columns = await queryInterface.describeTable(table, { transaction });
  //   for (const column of ['status', 'statusFicha', 'email_ben', 'email']) {
  //     if (columns[column]) {
  //       await queryInterface.removeColumn(table, column, { transaction });
  //     }
  //   }
  // });
}

// El rollback restaura el esquema legacy conocido, no los datos eliminados.
export async function down(queryInterface: QueryInterface): Promise<void> {
  // await queryInterface.sequelize.transaction(async (transaction) => {
  //   const columns = await queryInterface.describeTable(table, { transaction });
  //   const definitions = {
  //     status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  //     statusFicha: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  //     email_ben: { type: DataTypes.STRING, allowNull: true },
  //   };
  //   for (const [column, definition] of Object.entries(definitions)) {
  //     if (!columns[column]) {
  //       await queryInterface.addColumn(table, column, definition, { transaction });
  //     }
  //   }
  // });
}
