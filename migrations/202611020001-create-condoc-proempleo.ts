import { DataTypes, QueryInterface } from 'sequelize';

// Tabla paralela de CONDOC con los mismos tipos. Actúa como continuación de la
// original: la nueva recibe los documentos nuevos y sus cambios de estado; la
// antigua solo se ve/lista. Sin FK ni índices adicionales, igual que
// intermediarios/ejecutores. La unicidad del folio entre ambas tablas se
// valida en servicio.
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.createTable({ schema: 'dbo', tableName: 'condoc_proempleo' }, {
      id_condoc: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
      fol_condoc: { type: 'CHAR(8)', allowNull: false },
      cod_ano: { type: DataTypes.INTEGER, allowNull: false },
      corr_mar: { type: DataTypes.INTEGER, allowNull: false },
      tip_condoc: { type: 'VARCHAR(50)', allowNull: false },
      cod_are: { type: DataTypes.INTEGER, allowNull: false },
      des_condoc: { type: 'VARCHAR(250)', allowNull: false },
      ant_condoc: { type: 'VARCHAR(250)', allowNull: true },
      est_condoc: { type: 'VARCHAR(50)', allowNull: false },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_mod: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
      usu_eli: { type: 'VARCHAR(50)', allowNull: true },
      Fol_pro: { type: 'VARCHAR(50)', allowNull: true },
      fec_pro: { type: 'DATETIME', allowNull: true },
      usu_pro: { type: 'VARCHAR(50)', allowNull: true },
    }, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.dropTable({ schema: 'dbo', tableName: 'condoc_proempleo' }, { transaction });
  });
}
