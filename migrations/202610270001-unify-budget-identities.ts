import { QueryInterface, QueryTypes, Transaction } from 'sequelize';

async function renumerar(qi: QueryInterface, tabla: string, original: string, llave: string,
  columnas: string[], referencias: string, transaction: Transaction) {
  const campos = columnas.map((campo) => `[${campo}]`).join(', ');
  const valores = columnas.map((campo) => campo === llave ? 'm.nuevo' : `p.[${campo}]`).join(', ');
  await qi.sequelize.query(`
    DECLARE @maxOriginal INT, @maxActual INT;
    SELECT @maxOriginal = ISNULL(MAX([${llave}]), 0) FROM dbo.[${original}] WITH (TABLOCKX, HOLDLOCK);
    SELECT @maxActual = ISNULL(MAX([${llave}]), 0) FROM dbo.[${tabla}] WITH (TABLOCKX, HOLDLOCK);
    DECLARE @map TABLE (viejo INT PRIMARY KEY, nuevo INT NOT NULL);
    INSERT INTO @map SELECT [${llave}],
      (CASE WHEN @maxOriginal > @maxActual THEN @maxOriginal ELSE @maxActual END)
      + ROW_NUMBER() OVER (ORDER BY [${llave}])
      FROM dbo.[${tabla}] WHERE [${llave}] <= @maxOriginal;
    SET IDENTITY_INSERT dbo.[${tabla}] ON;
    BEGIN TRY
      INSERT INTO dbo.[${tabla}] (${campos})
        SELECT ${valores} FROM dbo.[${tabla}] p JOIN @map m ON m.viejo = p.[${llave}];
      ${referencias}
      DELETE p FROM dbo.[${tabla}] p JOIN @map m ON m.viejo = p.[${llave}];
      SET IDENTITY_INSERT dbo.[${tabla}] OFF;
    END TRY
    BEGIN CATCH
      SET IDENTITY_INSERT dbo.[${tabla}] OFF;
      THROW;
    END CATCH;
    DECLARE @maxNuevo INT, @ultimo BIGINT, @semilla BIGINT;
    SELECT @maxNuevo = ISNULL(MAX([${llave}]), 0) FROM dbo.[${tabla}];
    SELECT @ultimo = CONVERT(BIGINT, last_value) FROM sys.identity_columns
      WHERE object_id = OBJECT_ID('dbo.${tabla}');
    SET @semilla = CASE WHEN @maxOriginal > @maxNuevo THEN @maxOriginal ELSE @maxNuevo END;
    IF @ultimo > @semilla SET @semilla = @ultimo;
    IF @ultimo IS NULL SET @semilla = @semilla + 1;
    DECLARE @sql NVARCHAR(300) = N'DBCC CHECKIDENT (''dbo.${tabla}'', RESEED, '
      + CONVERT(NVARCHAR(30), @semilla) + N') WITH NO_INFOMSGS';
    EXEC sp_executesql @sql;`, { transaction });
}

export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    const duplicados = await qi.sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM dbo.dechacienda_proempleo p WITH (TABLOCKX, HOLDLOCK)
      JOIN dbo.DECHACIENDA l WITH (TABLOCKX, HOLDLOCK) ON l.fol_dechac = p.fol_dechac`,
    { type: QueryTypes.SELECT, transaction });
    if (duplicados[0].total) throw new Error('Hay folios de Hacienda repetidos; se debe resolver su numeración antes de migrar');
    const auditoria = ['usu_cre', 'fec_cre', 'usu_mod', 'fec_mod', 'usu_eli', 'fec_eli'];
    await renumerar(qi, 'marco_proempleo', 'MARCO', 'corr_mar', [
      'corr_mar', 'ano_mar', 'subtitulo_mar', 'item_mar', 'linea_mar', 'nombre_mar', 'monto_mar',
      ...auditoria, 'est_mar', 'ema_mar', 'tip_mar',
    ], `
      UPDATE d SET corr_mar = m.nuevo FROM dbo.marcodet_proempleo d JOIN @map m ON m.viejo = d.corr_mar;
      UPDATE d SET corr_mar = m.nuevo FROM dbo.detdechacienda_proempleo d
        JOIN @map m ON m.viejo = d.corr_mar WHERE d.origen_mar = 'proempleo';`, transaction);
    await renumerar(qi, 'marcodet_proempleo', 'MARCODET', 'corr_detmar', [
      'glo_detmar', 'ano_mar', 'subtitulo_mar', 'item_mar', 'linea_mar', 'corr_detmar', 'nom_detmar',
      'acc_detmar', 'mon_detmar', ...auditoria, 'corr_mar',
    ], `
      UPDATE d SET corr_detmar = m.nuevo FROM dbo.detdechacienda_proempleo d
        JOIN @map m ON m.viejo = d.corr_detmar WHERE d.origen_mar = 'proempleo';`, transaction);
    await renumerar(qi, 'detdechacienda_proempleo', 'DETDECHACIENDA', 'corr_dethac', [
      'fol_dechac', 'corr_dethac', 'corr_mar', 'corr_detmar', 'acc_dethac', 'mon_dethac', 'origen_mar', 'glosa_dethac',
    ], '', transaction);
  });
}

export async function down(): Promise<void> {
  throw new Error('La continuidad de correlativos no se revierte automáticamente: requiere restaurar IDs y referencias desde un respaldo');
}
