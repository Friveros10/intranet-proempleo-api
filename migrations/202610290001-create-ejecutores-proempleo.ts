import { DataTypes, QueryInterface } from 'sequelize';

// Tabla paralela de EJECUTORES con tipos exactos. Actúa como continuación de la
// original: la nueva permite crear/editar, la antigua solo ver/listar. Sin FK ni
// índices adicionales, igual que intermediarios/responsables. La unicidad del RUT
// entre ambas tablas se valida en servicio.
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.createTable({ schema: 'dbo', tableName: 'ejecutores_proempleo' }, {
      rut_eje: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      dig_eje: { type: 'NCHAR(1)', allowNull: false },
      nom_eje: { type: 'VARCHAR(150)', allowNull: false },
      dir_eje: { type: 'VARCHAR(150)', allowNull: true },
      reg_eje: { type: DataTypes.INTEGER, allowNull: false },
      ciu_eje: { type: DataTypes.INTEGER, allowNull: false },
      com_eje: { type: DataTypes.INTEGER, allowNull: false },
      tel_eje: { type: DataTypes.INTEGER, allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_mod: { type: 'DATETIME', allowNull: true },
      usu_eli: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
      Est_eje: { type: 'VARCHAR(15)', allowNull: true },
      rut_res: { type: DataTypes.INTEGER, allowNull: true },
    }, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.dropTable({ schema: 'dbo', tableName: 'ejecutores_proempleo' }, { transaction });
  });
}
