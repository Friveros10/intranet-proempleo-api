import { DataTypes, QueryInterface } from 'sequelize';

// Tablas paralelas de OFICIOCOB y ORDOFICOB con los mismos tipos. Actúan como
// continuación de las originales: las nuevas reciben los ordinarios y
// coberturas nuevas; las antiguas solo se ven/listan. Sin FK ni índices
// adicionales. corr_ofi es IDENTITY con semilla sobre el máximo de OFICIOCOB,
// de modo que ambas tablas funcionan como una sola sin repetir correlativos.
// ordOficob_proempleo agrega cod_region: la región queda fija en el ordinario.
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.createTable({ schema: 'dbo', tableName: 'ordOficob_proempleo' }, {
      ord_ofi: { type: 'CHAR(10)', primaryKey: true, allowNull: false },
      cod_region: { type: DataTypes.INTEGER, allowNull: false },
      fec_ofi: { type: 'DATETIME', allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
    }, { transaction });
    await qi.createTable({ schema: 'dbo', tableName: 'oficiocob_proempleo' }, {
      corr_ofi: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
      ord_ofi: { type: 'CHAR(10)', allowNull: false },
      CORR_MAR: { type: DataTypes.INTEGER, allowNull: false },
      Mes_ofi: { type: DataTypes.INTEGER, allowNull: false },
      ano_ofi: { type: DataTypes.INTEGER, allowNull: false },
      cod_reg: { type: DataTypes.INTEGER, allowNull: false },
      cod_ciu: { type: DataTypes.INTEGER, allowNull: false },
      cod_com: { type: DataTypes.INTEGER, allowNull: false },
      jor_ofi: { type: 'VARCHAR(50)', allowNull: false },
      tip_ofi: { type: 'VARCHAR(50)', allowNull: false },
      ben_ofi: { type: DataTypes.INTEGER, allowNull: false },
      mon_ofi: { type: 'NUMERIC(18,0)', allowNull: false },
    }, { transaction });
    await qi.sequelize.query(`
      DECLARE @semilla INT;
      SELECT @semilla = ISNULL(MAX(corr_ofi), 0) FROM dbo.OFICIOCOB WITH (TABLOCKX, HOLDLOCK);
      DBCC CHECKIDENT ('dbo.oficiocob_proempleo', RESEED, @semilla) WITH NO_INFOMSGS;`,
    { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.dropTable({ schema: 'dbo', tableName: 'oficiocob_proempleo' }, { transaction });
    await qi.dropTable({ schema: 'dbo', tableName: 'ordOficob_proempleo' }, { transaction });
  });
}
