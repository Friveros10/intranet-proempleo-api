import type { QueryInterface } from 'sequelize';

export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(`
      CREATE TABLE dbo.itemgastos_proempleo (
        corr_mar INT NOT NULL,
        corr_itemGas INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_itemgastos_proempleo PRIMARY KEY,
        nom_itemGas VARCHAR(80) NOT NULL,
        usu_cre VARCHAR(50) NOT NULL,
        fec_cre DATETIME NOT NULL DEFAULT GETDATE(),
        categoria VARCHAR(50) NULL
      );
      CREATE INDEX IX_itemgastos_proempleo_marco ON dbo.itemgastos_proempleo(corr_mar, corr_itemGas);
    `, { transaction });
    await qi.sequelize.query(`
      CREATE VIEW dbo.itemgastos_unificados AS
        SELECT corr_mar, corr_itemGas, nom_itemGas, usu_cre, fec_cre, categoria, 'legacy' origen FROM dbo.ITEMGASTOS
        UNION ALL
        SELECT corr_mar, corr_itemGas, nom_itemGas, usu_cre, fec_cre, categoria, 'proempleo' FROM dbo.itemgastos_proempleo;
    `, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query('DROP VIEW dbo.itemgastos_unificados;', { transaction });
    await qi.sequelize.query('DROP TABLE dbo.itemgastos_proempleo;', { transaction });
  });
}
