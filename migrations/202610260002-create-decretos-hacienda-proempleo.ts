import { DataTypes, QueryInterface } from 'sequelize';

const cabecera = { schema: 'dbo', tableName: 'dechacienda_proempleo' };
const detalle = { schema: 'dbo', tableName: 'detdechacienda_proempleo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(cabecera, {
      fol_dechac: { type: 'VARCHAR(50)', primaryKey: true, allowNull: false },
      fec_dechac: { type: 'DATETIME', allowNull: false },
      mon_dechac: { type: 'NUMERIC(18,0)', allowNull: false },
      obs_dechac: { type: 'VARCHAR(200)', allowNull: true },
      est_dechac: { type: 'VARCHAR(50)', allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_mod: { type: 'DATETIME', allowNull: true },
      usu_eli: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
    }, { transaction });
    await queryInterface.createTable(detalle, {
      fol_dechac: { type: 'VARCHAR(50)', primaryKey: true, allowNull: false },
      corr_dethac: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      corr_mar: { type: DataTypes.INTEGER, allowNull: false },
      corr_detmar: { type: DataTypes.INTEGER, allowNull: true },
      acc_dethac: { type: 'VARCHAR(50)', allowNull: false },
      mon_dethac: { type: 'NUMERIC(18,0)', allowNull: false },
      origen_mar: { type: 'VARCHAR(10)', allowNull: false },
      glosa_dethac: { type: 'VARCHAR(50)', allowNull: false },
    }, { transaction });
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable(detalle, { transaction });
    await queryInterface.dropTable(cabecera, { transaction });
  });
}
