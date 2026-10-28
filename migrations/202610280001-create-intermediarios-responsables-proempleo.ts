import { DataTypes, QueryInterface } from 'sequelize';

// Tablas paralelas de INTERMEDIARIOS y RESPONSABLES con tipos exactos.
// Actúan como continuación de las originales: las nuevas permiten crear/editar,
// las antiguas solo ver/listar. Sin FK ni índices adicionales, igual que lo acordado
// para marco/decretos. La unicidad del RUT entre ambas tablas se valida en servicio.
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.createTable({ schema: 'dbo', tableName: 'intermediarios_proempleo' }, {
      rut_int: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      dig_int: { type: 'NCHAR(1)', allowNull: false },
      nom_int: { type: 'VARCHAR(150)', allowNull: false },
      dir_int: { type: 'VARCHAR(150)', allowNull: true },
      reg_int: { type: DataTypes.INTEGER, allowNull: false },
      ciu_int: { type: DataTypes.INTEGER, allowNull: false },
      com_int: { type: DataTypes.INTEGER, allowNull: false },
      tel_int: { type: DataTypes.INTEGER, allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_mod: { type: 'DATETIME', allowNull: true },
      usu_eli: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
      Est_int: { type: 'VARCHAR(15)', allowNull: true },
      ema_int: { type: 'VARCHAR(50)', allowNull: true },
      int_int: { type: 'CHAR(1)', allowNull: true },
      rut_res: { type: DataTypes.INTEGER, allowNull: true },
    }, { transaction });
    await qi.createTable({ schema: 'dbo', tableName: 'responsables_proempleo' }, {
      rut_res: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      dig_res: { type: 'NCHAR(1)', allowNull: false },
      nom_res: { type: 'VARCHAR(50)', allowNull: false },
      pat_res: { type: 'VARCHAR(50)', allowNull: false },
      mat_res: { type: 'VARCHAR(50)', allowNull: false },
      dir_res: { type: 'VARCHAR(50)', allowNull: true },
      reg_res: { type: DataTypes.INTEGER, allowNull: false },
      ciu_res: { type: DataTypes.INTEGER, allowNull: false },
      com_res: { type: DataTypes.INTEGER, allowNull: false },
      tel_res: { type: 'VARCHAR(50)', allowNull: true },
      civ_res: { type: 'VARCHAR(50)', allowNull: false },
      nac_res: { type: 'VARCHAR(50)', allowNull: false },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_mod: { type: 'DATETIME', allowNull: true },
      usu_eli: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
      Est_res: { type: 'VARCHAR(15)', allowNull: true },
      fax_res: { type: 'VARCHAR(50)', allowNull: true },
      ema_res: { type: 'VARCHAR(60)', allowNull: true },
      car_res: { type: 'VARCHAR(50)', allowNull: true },
    }, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.dropTable({ schema: 'dbo', tableName: 'intermediarios_proempleo' }, { transaction });
    await qi.dropTable({ schema: 'dbo', tableName: 'responsables_proempleo' }, { transaction });
  });
}
