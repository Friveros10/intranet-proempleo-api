import { DataTypes, QueryInterface } from 'sequelize';

// Tablas paralelas de PROYECTOS y PROITEMGAS con los tipos reales verificados en
// SQL Server. Actúan como continuación de las originales: las nuevas permiten
// crear/editar/eliminar (lógico), las antiguas solo ver/listar. fol_pro es PK
// natural (sin identity): el correlativo continúa el máximo de ambas tablas y la
// unicidad entre ambas se valida en servicio. banco_pro es una diferencia
// aprobada: referencia al catálogo estático Banco_proyectos (constants), NULL en
// los registros legacy. Sin FK ni índices adicionales, igual que los otros módulos.
export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.createTable({ schema: 'dbo', tableName: 'proyectos_proempleo' }, {
      fol_pro: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      nom_pro: { type: 'VARCHAR(300)', allowNull: false },
      rutint_pro: { type: DataTypes.INTEGER, allowNull: false },
      ruteje_pro: { type: DataTypes.INTEGER, allowNull: false },
      reg_pro: { type: DataTypes.INTEGER, allowNull: false },
      ciu_pro: { type: DataTypes.INTEGER, allowNull: false },
      obj_pro: { type: 'VARCHAR(200)', allowNull: true },
      imp_pro: { type: 'VARCHAR(200)', allowNull: true },
      obs_pro: { type: 'VARCHAR(200)', allowNull: true },
      mes_pro: { type: DataTypes.INTEGER, allowNull: true },
      emp_pro: { type: DataTypes.INTEGER, allowNull: true },
      fecini_pro: { type: 'DATETIME', allowNull: true },
      fecter_pro: { type: 'DATETIME', allowNull: true },
      rutres_pro: { type: DataTypes.INTEGER, allowNull: true },
      fec_pro: { type: 'DATETIME', allowNull: true },
      carres_pro: { type: 'VARCHAR(50)', allowNull: true },
      faxres_pro: { type: DataTypes.INTEGER, allowNull: true },
      emares_pro: { type: 'VARCHAR(50)', allowNull: true },
      subtitulo_mar: { type: DataTypes.INTEGER, allowNull: false },
      item_mar: { type: DataTypes.INTEGER, allowNull: false },
      linea_mar: { type: DataTypes.INTEGER, allowNull: false },
      glo_detmar: { type: DataTypes.INTEGER, allowNull: true },
      corr_mar: { type: DataTypes.INTEGER, allowNull: false },
      corr_detmar: { type: DataTypes.INTEGER, allowNull: true },
      usu_cre: { type: 'VARCHAR(50)', allowNull: true },
      fec_cre: { type: 'DATETIME', allowNull: true },
      usu_mod: { type: 'VARCHAR(50)', allowNull: true },
      fec_mod: { type: 'DATETIME', allowNull: true },
      usu_eli: { type: 'VARCHAR(50)', allowNull: true },
      fec_eli: { type: 'DATETIME', allowNull: true },
      est_pro: { type: 'VARCHAR(50)', allowNull: true },
      mon_pro: { type: 'NUMERIC(18,0)', allowNull: true },
      jor_pro: { type: 'VARCHAR(15)', allowNull: true },
      com_pro: { type: DataTypes.INTEGER, allowNull: true },
      folext_pro: { type: 'VARCHAR(15)', allowNull: true },
      ano_pro: { type: DataTypes.INTEGER, allowNull: true },
      key_imp: { type: 'VARCHAR(8)', allowNull: true },
      usu_imp: { type: 'VARCHAR(50)', allowNull: true },
      fec_imp: { type: 'DATETIME', allowNull: true },
      usu_apr: { type: 'VARCHAR(50)', allowNull: true },
      fec_apr: { type: 'DATETIME', allowNull: true },
      otroemp_pro: { type: DataTypes.INTEGER, allowNull: true },
      usu_act: { type: 'VARCHAR(50)', allowNull: true },
      fec_act: { type: 'DATETIME', allowNull: true },
      usu_rech: { type: 'VARCHAR(20)', allowNull: true },
      fec_rech: { type: 'DATETIME', allowNull: true },
      EstApr_pro: { type: 'VARCHAR(15)', allowNull: true },
      Dir_pro: { type: 'VARCHAR(100)', allowNull: true },
      Latitud: { type: DataTypes.FLOAT, allowNull: true },
      Longitud: { type: DataTypes.FLOAT, allowNull: true },
      banco_pro: { type: DataTypes.INTEGER, allowNull: true },
    }, { transaction });

    await qi.createTable({ schema: 'dbo', tableName: 'proitemgas_proempleo' }, {
      corr_itemGas: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      fol_pro: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      mon_proitemgas: { type: 'NUMERIC(18,0)', allowNull: false },
      obs_proitemgas: { type: 'VARCHAR(250)', allowNull: true },
    }, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async (transaction) => {
    await qi.dropTable({ schema: 'dbo', tableName: 'proitemgas_proempleo' }, { transaction });
    await qi.dropTable({ schema: 'dbo', tableName: 'proyectos_proempleo' }, { transaction });
  });
}
