import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

/**
 * Completa los tres objetos paralelos usados por el detalle de gastos:
 *
 * - PROITEMGAS             -> proitemgas_proempleo (creada en 202611050001)
 * - DETRENDICION           -> detrendicion_proempleo
 * - Vista_ProItemGas       -> Vista_ProItemGas_proempleo
 *
 * ITEMGASTOS continúa siendo el catálogo común a ambos circuitos. La vista
 * paralela conserva exactamente las columnas y la agrupación de la vista legacy.
 */
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    const [proitemgas] = await qi.sequelize.query<{ existe: number }>(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.proitemgas_proempleo', N'U') IS NULL THEN 0 ELSE 1 END AS existe
    `, { type: QueryTypes.SELECT, transaction });

    if (!proitemgas?.existe) {
      await qi.createTable({ schema: 'dbo', tableName: 'proitemgas_proempleo' }, {
        corr_itemGas: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
        fol_pro: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
        mon_proitemgas: { type: 'NUMERIC(18,0)', allowNull: false },
        obs_proitemgas: { type: 'VARCHAR(250)', allowNull: true },
      }, { transaction });
    }

    await qi.createTable({ schema: 'dbo', tableName: 'detrendicion_proempleo' }, {
      corr_detren: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      mes_detren: { type: DataTypes.INTEGER, allowNull: false },
      ano_detren: { type: DataTypes.INTEGER, allowNull: false },
      fol_dec: { type: 'CHAR(8)', allowNull: false },
      fol_pro: { type: DataTypes.INTEGER, allowNull: false },
      mon_detren: { type: 'NUMERIC(18,0)', allowNull: false },
      che_detren: { type: 'VARCHAR(15)', allowNull: false },
      fac_detren: { type: 'NUMERIC(18,0)', allowNull: false },
      fecfac_detren: { type: 'DATETIME', allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
      est_detren: { type: 'VARCHAR(50)', allowNull: true },
      corr_ren: { type: DataTypes.INTEGER, allowNull: true },
      corr_itemgas: { type: DataTypes.INTEGER, allowNull: true },
      egr_detren: { type: 'VARCHAR(15)', allowNull: true },
      glo_detren: { type: 'VARCHAR(200)', allowNull: true },
      cod_region: { type: DataTypes.INTEGER, allowNull: true },
      EstApr_detren: { type: 'VARCHAR(15)', allowNull: true },
      corr_detren3: { type: DataTypes.INTEGER, allowNull: true },
    }, { transaction });

    await qi.sequelize.query(`
      CREATE NONCLUSTERED INDEX [IX_detrendicion_proempleo_periodo]
      ON [dbo].[detrendicion_proempleo] ([mes_detren], [ano_detren])
      INCLUDE ([fol_dec], [fol_pro], [mon_detren])
    `, { transaction });

    await qi.sequelize.query(`
      CREATE VIEW [dbo].[Vista_ProItemGas_proempleo]
      AS
      SELECT [corr_mar], [corr_itemGas], [nom_itemGas]
      FROM [dbo].[ITEMGASTOS]
      GROUP BY [corr_mar], [corr_itemGas], [nom_itemGas]
    `, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.sequelize.query(`
      IF OBJECT_ID(N'dbo.Vista_ProItemGas_proempleo', N'V') IS NOT NULL
        DROP VIEW [dbo].[Vista_ProItemGas_proempleo]
    `, { transaction });
    await qi.dropTable({ schema: 'dbo', tableName: 'detrendicion_proempleo' }, { transaction });
    // proitemgas_proempleo pertenece a 202611050001 y se revierte allí.
  });
}
