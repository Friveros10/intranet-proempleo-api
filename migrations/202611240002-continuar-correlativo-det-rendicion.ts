import type { QueryInterface } from "sequelize";

// La migración de gastos de proyecto ya creó la tabla de continuación.
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(
      `
      DECLARE @legacy BIGINT, @actual BIGINT, @ultimo BIGINT;
      SELECT @legacy = ISNULL(MAX(corr_detren), 0) FROM dbo.DETRENDICION WITH (TABLOCK, HOLDLOCK);
      SELECT @actual = ISNULL(MAX(corr_detren), 0) FROM dbo.detrendicion_proempleo WITH (TABLOCKX, HOLDLOCK);
      SELECT @ultimo = CONVERT(BIGINT, last_value) FROM sys.identity_columns
      WHERE object_id = OBJECT_ID('dbo.detrendicion_proempleo') AND name = 'corr_detren';

      IF @ultimo IS NULL
      BEGIN
        -- En una identidad sin uso SQL Server devuelve la semilla en el primer INSERT.
        DECLARE @primero BIGINT = CASE WHEN @legacy > @actual THEN @legacy ELSE @actual END + 1;
        DBCC CHECKIDENT ('dbo.detrendicion_proempleo', RESEED, @primero) WITH NO_INFOMSGS;
      END
      ELSE IF @ultimo < @legacy OR @ultimo < @actual
      BEGIN
        DECLARE @semilla BIGINT = CASE WHEN @legacy > @actual THEN @legacy ELSE @actual END;
        DBCC CHECKIDENT ('dbo.detrendicion_proempleo', RESEED, @semilla) WITH NO_INFOMSGS;
      END
    `,
      { transaction },
    );
  });
}

export async function down(_qi: QueryInterface): Promise<void> {
  // La secuencia se conserva para evitar reutilizar correlativos emitidos.
}
