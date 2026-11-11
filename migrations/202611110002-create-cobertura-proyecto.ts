import { DataTypes, QueryInterface } from 'sequelize';

// Referencias con origen explícito: pueden apuntar a tablas legacy o ProEmpleo
// sin modificar las tablas históricas ni confundir sus identificadores.
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.createTable({ schema: 'dbo', tableName: 'coberturaProyecto' }, {
      fol_pro: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      origen_proyecto: { type: 'VARCHAR(10)', primaryKey: true, allowNull: false },
      corr_ofi: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      origen_cobertura: { type: 'VARCHAR(10)', primaryKey: true, allowNull: false },
      ord_ofi: { type: 'CHAR(10)', allowNull: false },
      origen_oficio: { type: 'VARCHAR(10)', allowNull: false },
      usu_cre: { type: 'VARCHAR(50)', allowNull: false },
      fec_cre: { type: 'DATETIME', allowNull: false },
    }, { transaction });
    // await qi.sequelize.query(`ALTER TABLE dbo.coberturaProyecto ADD
    //   CONSTRAINT CK_coberturaProyecto_origen CHECK (
    //     origen_proyecto IN ('legacy', 'proempleo') AND
    //     origen_cobertura IN ('legacy', 'proempleo') AND
    //     origen_oficio IN ('legacy', 'proempleo'))`, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.dropTable({ schema: 'dbo', tableName: 'coberturaProyecto' });
}
