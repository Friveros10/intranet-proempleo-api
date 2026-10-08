import { DataTypes, QueryInterface } from 'sequelize';

const table = { tableName: 'usuarios_proempleo', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(table, {
    rut_usu: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    log_usu: { type: 'VARCHAR(50)', allowNull: false },
    dig_usu: { type: 'VARCHAR(1)', allowNull: false },
    niv_usu: { type: DataTypes.INTEGER, allowNull: true },
    nom_usu: { type: 'VARCHAR(50)', allowNull: false },
    pat_usu: { type: 'VARCHAR(50)', allowNull: false },
    cla_usu: { type: 'VARCHAR(50)', allowNull: false },
    mat_usu: { type: 'VARCHAR(50)', allowNull: true },
    dir_usu: { type: 'VARCHAR(50)', allowNull: true },
    reg_usu: { type: DataTypes.INTEGER, allowNull: true },
    ciu_usu: { type: DataTypes.INTEGER, allowNull: true },
    com_usu: { type: DataTypes.INTEGER, allowNull: true },
    usu_cre: { type: 'VARCHAR(50)', allowNull: true },
    fec_cre: { type: 'DATETIME', allowNull: true },
    usu_mod: { type: 'VARCHAR(50)', allowNull: true },
    fec_mod: { type: 'DATETIME', allowNull: true },
    usu_eli: { type: 'VARCHAR(50)', allowNull: true },
    fec_eli: { type: 'DATETIME', allowNull: true },
    corr_rol: { type: DataTypes.INTEGER, allowNull: true },
    ema_usu: { type: 'VARCHAR(50)', allowNull: true },
    cla2_usu: { type: 'VARBINARY(MAX)', allowNull: true },
    est_usu: { type: 'VARCHAR(15)', allowNull: true },
    fec_cad_pass: { type: 'DATETIME', allowNull: true },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(table);
}

// npm run db:migrate
// npm run seed:reemplazo-roles   