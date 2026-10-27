import { DataTypes, QueryInterface } from 'sequelize';

export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.createTable({ schema: 'dbo', tableName: 'decretos_proempleo' }, {
      fol_dec: { type: 'CHAR(8)', primaryKey: true, allowNull: false },
      folprov_dec: { type: 'CHAR(8)', allowNull: true },
      ano_dec: { type: DataTypes.INTEGER, allowNull: false },
      fec_dec: { type: 'DATETIME', allowNull: false },
      obs_dec: { type: 'VARCHAR(250)', allowNull: true },
      mon_dec: { type: 'NUMERIC(18,0)', allowNull: false },
      cob_dec: { type: 'VARCHAR(15)', allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_mod: { type: 'DATETIME', allowNull: true },
      usu_eli: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
      est_dec: { type: 'VARCHAR(50)', allowNull: true },
      rutint_dec: { type: DataTypes.INTEGER, allowNull: true },
      programaInt: { type: 'VARCHAR(250)', allowNull: true },
    }, { transaction });
    await qi.createTable({ schema: 'dbo', tableName: 'decretosDetalle_proempleo' }, {
      fol_dec: { type: 'CHAR(8)', allowNull: false },
      corr_mar: { type: DataTypes.INTEGER, allowNull: false },
      corr_detmar: { type: DataTypes.INTEGER, allowNull: false },
      mon_decdet: { type: 'NUMERIC(18,0)', allowNull: true },
      sublinea: { type: 'VARCHAR(20)', allowNull: true },
    }, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.dropTable({ schema: 'dbo', tableName: 'decretosDetalle_proempleo' }, { transaction });
    await qi.dropTable({ schema: 'dbo', tableName: 'decretos_proempleo' }, { transaction });
  });
}
