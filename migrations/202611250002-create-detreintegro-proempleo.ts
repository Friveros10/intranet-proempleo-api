import type { QueryInterface } from 'sequelize';

export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(`
      CREATE TABLE dbo.detreintegro_proempleo (
        corr_detrei INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_detreintegro_proempleo PRIMARY KEY,
        mes_detrei INT NOT NULL,
        ano_detrei INT NOT NULL,
        fol_dec CHAR(8) NOT NULL,
        fol_pro INT NOT NULL,
        mon_detrei NUMERIC(18,0) NOT NULL,
        che_detrei VARCHAR(25) NOT NULL,
        fecche_detrei DATETIME NULL,
        usu_cre VARCHAR(50) NULL,
        fec_cre DATETIME NULL,
        usu_mod VARCHAR(50) NULL,
        fec_eli DATETIME NULL,
        est_detrei VARCHAR(50) NULL,
        cod_region INT NULL,
        mem_detrei VARCHAR(8) NULL,
        fecmem_detrei DATETIME NULL,
        ord_detrei VARCHAR(8) NULL,
        fecord_detrei DATETIME NULL
      );
      CREATE INDEX IX_detreintegro_proempleo_periodo
        ON dbo.detreintegro_proempleo(fol_dec, ano_detrei, mes_detrei, corr_detrei);
    `, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.dropTable({ schema: 'dbo', tableName: 'detreintegro_proempleo' });
}
