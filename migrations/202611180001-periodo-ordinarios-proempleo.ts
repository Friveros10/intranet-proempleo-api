import type { QueryInterface } from 'sequelize';

export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(`
      ALTER TABLE dbo.ordOficob_proempleo ADD ano_ofi INT NULL, mes_desde INT NULL, mes_hasta INT NULL;
    `, { transaction });
    await qi.sequelize.query(`
      WITH periodos AS (
        SELECT ord_ofi, MIN(ano_ofi) ano_ofi, MIN(Mes_ofi) mes_desde, MAX(Mes_ofi) mes_hasta
        FROM dbo.oficiocob_proempleo
        GROUP BY ord_ofi
        HAVING MIN(ano_ofi) = MAX(ano_ofi) AND MIN(ano_ofi) BETWEEN 1900 AND 9998
          AND MIN(Mes_ofi) >= 1 AND MAX(Mes_ofi) <= 12
          AND COUNT(ano_ofi) = COUNT(*) AND COUNT(Mes_ofi) = COUNT(*)
          AND COUNT(DISTINCT Mes_ofi) = MAX(Mes_ofi) - MIN(Mes_ofi) + 1
      )
      UPDATE o SET ano_ofi = p.ano_ofi, mes_desde = p.mes_desde, mes_hasta = p.mes_hasta
      FROM dbo.ordOficob_proempleo o JOIN periodos p ON p.ord_ofi = o.ord_ofi;

      ALTER TABLE dbo.ordOficob_proempleo ADD CONSTRAINT CK_ordOficob_proempleo_periodo CHECK (
        (ano_ofi IS NULL AND mes_desde IS NULL AND mes_hasta IS NULL)
        OR (ano_ofi IS NOT NULL AND mes_desde IS NOT NULL AND mes_hasta IS NOT NULL
          AND ano_ofi BETWEEN 1900 AND 9998 AND mes_desde BETWEEN 1 AND 12 AND mes_hasta BETWEEN mes_desde AND 12)
      );
    `, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(`
      ALTER TABLE dbo.ordOficob_proempleo DROP CONSTRAINT CK_ordOficob_proempleo_periodo;
      ALTER TABLE dbo.ordOficob_proempleo DROP COLUMN ano_ofi, mes_desde, mes_hasta;
    `, { transaction });
  });
}
