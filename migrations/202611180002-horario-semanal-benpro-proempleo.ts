import type { QueryInterface } from 'sequelize';

export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(`
      ALTER TABLE dbo.benpro_proempleo ALTER COLUMN horario_benpro VARCHAR(MAX) NULL;
      ALTER TABLE dbo.benpro_proempleo ADD horario_benproJson NVARCHAR(MAX) NULL;
    `, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(`
      IF EXISTS (SELECT 1 FROM dbo.benpro_proempleo WHERE DATALENGTH(horario_benpro) > 200)
        THROW 50000, 'Hay horarios que exceden los 200 caracteres.', 1;
      ALTER TABLE dbo.benpro_proempleo DROP COLUMN horario_benproJson;
      ALTER TABLE dbo.benpro_proempleo ALTER COLUMN horario_benpro VARCHAR(200) NULL;
    `, { transaction });
  });
}
