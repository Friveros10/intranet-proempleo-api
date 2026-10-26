import { DataTypes, QueryInterface } from 'sequelize';

const marco = { schema: 'dbo', tableName: 'marco_proempleo' };
const detalle = { schema: 'dbo', tableName: 'marcodet_proempleo' };

function clasificacion() {
  return {
    ano_mar: { type: DataTypes.INTEGER, allowNull: false },
    subtitulo_mar: { type: DataTypes.INTEGER, allowNull: false },
    item_mar: { type: DataTypes.INTEGER, allowNull: false },
    linea_mar: { type: DataTypes.INTEGER, allowNull: false },
  };
}

function auditoria(longitudCreador: number) {
  return {
    usu_cre: { type: `VARCHAR(${longitudCreador})`, allowNull: true },
    fec_cre: { type: 'DATETIME', allowNull: true },
    usu_mod: { type: 'VARCHAR(50)', allowNull: true },
    fec_mod: { type: 'DATETIME', allowNull: true },
    usu_eli: { type: 'VARCHAR(50)', allowNull: true },
    fec_eli: { type: 'DATETIME', allowNull: true },
  };
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(marco, {
      corr_mar: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      ...clasificacion(),
      nombre_mar: { type: 'VARCHAR(250)', allowNull: false },
      monto_mar: { type: 'NUMERIC(18,0)', allowNull: true },
      ...auditoria(15),
      est_mar: { type: 'VARCHAR(50)', allowNull: true },
      ema_mar: { type: 'VARCHAR(50)', allowNull: true },
      tip_mar: { type: 'VARCHAR(15)', allowNull: true },
    }, { transaction });
    await queryInterface.createTable(detalle, {
      glo_detmar: { type: DataTypes.INTEGER, allowNull: false },
      ...clasificacion(),
      corr_detmar: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nom_detmar: { type: 'VARCHAR(250)', allowNull: false },
      acc_detmar: { type: 'VARCHAR(50)', allowNull: false },
      mon_detmar: { type: 'NUMERIC(18,0)', allowNull: false },
      ...auditoria(50),
      corr_mar: { type: DataTypes.INTEGER, allowNull: true },
    }, { transaction });
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable(detalle, { transaction });
    await queryInterface.dropTable(marco, { transaction });
  });
}
