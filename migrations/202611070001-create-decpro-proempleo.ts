import type { QueryInterface } from 'sequelize';

const TABLE = 'dbo.decpro_proempleo';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    IF OBJECT_ID('${TABLE}', 'U') IS NULL
    BEGIN
      CREATE TABLE ${TABLE} (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_decpro_proempleo PRIMARY KEY,
        fol_dec CHAR(8) NOT NULL,
        fol_pro INT NOT NULL,
        folprov_dec CHAR(8) NOT NULL,
        cor_decpro INT NOT NULL,
        mon_decpro NUMERIC(18,0) NOT NULL,
        usu_cre VARCHAR(50) NULL,
        fec_cre DATETIME NULL,
        usu_eli VARCHAR(50) NULL,
        fec_eli DATETIME NULL,
        est_decpro VARCHAR(50) NULL
      );
      CREATE UNIQUE INDEX UX_decpro_proempleo_negocio
        ON ${TABLE}(fol_dec, fol_pro, folprov_dec, cor_decpro);
      CREATE INDEX IX_decpro_proempleo_folio ON ${TABLE}(fol_pro);
    END
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`IF OBJECT_ID('${TABLE}', 'U') IS NOT NULL DROP TABLE ${TABLE};`);
}
