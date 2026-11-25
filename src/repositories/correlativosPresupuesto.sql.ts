export function insertarConCorrelativo(
  heredada: "MARCO" | "MARCODET" | "DETDECHACIENDA" | "ITEMGASTOS",
  tabla:
    | "marco_proempleo"
    | "marcodet_proempleo"
    | "detdechacienda_proempleo"
    | "itemgastos_proempleo",
  llave: "corr_mar" | "corr_detmar" | "corr_dethac" | "corr_itemGas",
  columnas: string,
  valores: string,
) {
  return `
    DECLARE @ultimoLegacy BIGINT, @ultimoProempleo BIGINT, @identidadProempleo BIGINT, @correlativo BIGINT;
    SELECT @ultimoLegacy = MAX([${llave}]) FROM dbo.[${heredada}] WITH (TABLOCK, HOLDLOCK);
    SELECT @ultimoProempleo = MAX([${llave}]) FROM dbo.[${tabla}] WITH (TABLOCKX, HOLDLOCK);
    SELECT @identidadProempleo = CONVERT(BIGINT, last_value) FROM sys.identity_columns
      WHERE object_id = OBJECT_ID('dbo.${tabla}') AND name = '${llave}';

    SELECT @correlativo = MAX(ultimo) + 1 FROM (VALUES
      (0), (@ultimoLegacy), (@ultimoProempleo),
      (CONVERT(BIGINT, IDENT_CURRENT('dbo.${heredada}'))),
      (@identidadProempleo)
    ) correlativos(ultimo);

    SET IDENTITY_INSERT dbo.[${tabla}] ON;
    BEGIN TRY
      INSERT INTO dbo.[${tabla}] ([${llave}], ${columnas})
      OUTPUT INSERTED.[${llave}]
      VALUES (@correlativo, ${valores});
      SET IDENTITY_INSERT dbo.[${tabla}] OFF;
    END TRY
    BEGIN CATCH
      SET IDENTITY_INSERT dbo.[${tabla}] OFF;
      THROW;
    END CATCH;`;
}
