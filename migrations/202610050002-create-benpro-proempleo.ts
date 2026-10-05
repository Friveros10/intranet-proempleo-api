import { DataTypes, QueryInterface } from 'sequelize';

// Nueva tabla propia benpro_proempleo: replica la estructura de la tabla legacy
// dbo.BENPRO agregando un id autoincrementable como PK para futuros registros.
// Aún no es utilizada por la aplicación.
const table = { tableName: 'benpro_proempleo', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(table, {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    ano_BenPro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mes_benpro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fol_pro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rut_ben: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    com_ben: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cor_benpro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    est_benpro: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    usu_cre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fec_cre: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usu_eli: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fec_eli: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    key_imp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    usu_imp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fec_imp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usu_apr: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fec_apr: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sit_benpro: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sit_fec: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sit_usu: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dir_benpro: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    usu_mod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fec_mod: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(table);
}
