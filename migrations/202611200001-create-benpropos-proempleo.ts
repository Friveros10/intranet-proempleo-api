import type { QueryInterface } from "sequelize";

const columnas = `id_benpropos, fol_dec, mes_benpropos, ano_benpropos, fec_benpropos,
  usu_cre, fec_cre, usu_mod, fec_mod, usu_eli, fec_elli, est_benpropos, obs_benpropos`;

export async function up({ sequelize }: QueryInterface): Promise<void> {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
      SELECT TOP (0) ${columnas}
      INTO dbo.benpropos_proempleo
      FROM dbo.BENPROPOS;

      CREATE UNIQUE INDEX UX_benpropos_proempleo_id ON dbo.benpropos_proempleo(id_benpropos);
      CREATE INDEX IX_benpropos_proempleo_periodo
        ON dbo.benpropos_proempleo(fol_dec, ano_benpropos, mes_benpropos);
    `,
      { transaction },
    );
    await sequelize.query(
      `
      CREATE VIEW dbo.benpropos_consulta AS
        SELECT ${columnas}, 'legacy' AS origen FROM dbo.BENPROPOS
        UNION ALL
        SELECT ${columnas}, 'proempleo' AS origen FROM dbo.benpropos_proempleo;
    `,
      { transaction },
    );
  });
}

export async function down({ sequelize }: QueryInterface): Promise<void> {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query("DROP VIEW dbo.benpropos_consulta", { transaction });
    await sequelize.query("DROP TABLE dbo.benpropos_proempleo", {
      transaction,
    });
  });
}
