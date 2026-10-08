import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

// Tablas propias de roles y permisos ProEmpleo. Reemplazan a las legacy
// dbo.roles, dbo.menus y dbo.rol_menu, que quedan intactas: el seeder y los
// modelos pasan a escribir exclusivamente aquí.
//
// Las claves foráneas solo apuntan entre estas tres tablas nuevas.
const ROLES = { tableName: 'ROLES_proempleo', schema: 'dbo' };
const MENUS = { tableName: 'MENUS_proempleo', schema: 'dbo' };
const ROL_MENU = { tableName: 'ROL_MENU_proempleo', schema: 'dbo' };

async function existeIndice(
  queryInterface: QueryInterface,
  tabla: string,
  indice: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ existe: number }>(
    `SELECT CASE WHEN EXISTS (
       SELECT 1 FROM sys.indexes
       WHERE name = '${indice}' AND object_id = OBJECT_ID('dbo.${tabla}')
     ) THEN 1 ELSE 0 END AS existe`,
    { type: QueryTypes.SELECT },
  );
  return row.existe === 1;
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  // corr_rol no es identity: los roles usan códigos fijos definidos en el seeder.
  await queryInterface.createTable(ROLES, {
    corr_rol: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    nom_rol: { type: DataTypes.STRING(50), allowNull: true },
    est_rol: { type: DataTypes.STRING(15), allowNull: true },
  });

  await queryInterface.createTable(MENUS, {
    corr_men: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    cod_men: { type: DataTypes.STRING(10), allowNull: true },
    Nom_men: { type: DataTypes.STRING(50), allowNull: true },
    Tip_men: { type: DataTypes.STRING(255), allowNull: true },
    acc_men: { type: DataTypes.STRING(255), allowNull: true },
    tar_men: { type: DataTypes.STRING(255), allowNull: true },
    imagen: { type: DataTypes.STRING(255), allowNull: true },
    target_net: { type: DataTypes.STRING(255), allowNull: true },
    id_tip: { type: DataTypes.INTEGER, allowNull: true },
    url_net: { type: DataTypes.STRING(255), allowNull: true },
    url_spe: { type: DataTypes.STRING(255), allowNull: true },
    asp: { type: DataTypes.STRING(255), allowNull: true },
  });

  await queryInterface.createTable(ROL_MENU, {
    corr_RolMen: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    corr_rol: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: ROLES, key: 'corr_rol' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    corr_men: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: MENUS, key: 'corr_men' },
      onUpdate: 'NO ACTION',
      onDelete: 'CASCADE',
    },
    acc_RolMen: { type: 'CHAR(2)', allowNull: true },
  });

  // Índices filtrados: en SQL Server un índice único admite un solo NULL, y
  // ambas columnas son nullable para respetar la forma de los modelos.
  if (!(await existeIndice(queryInterface, 'MENUS_proempleo', 'UX_MENUS_proempleo_cod_men'))) {
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX UX_MENUS_proempleo_cod_men
         ON dbo.MENUS_proempleo (cod_men)
         WHERE cod_men IS NOT NULL`,
    );
  }

  if (!(await existeIndice(queryInterface, 'ROL_MENU_proempleo', 'UX_ROL_MENU_proempleo_rol_men'))) {
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX UX_ROL_MENU_proempleo_rol_men
         ON dbo.ROL_MENU_proempleo (corr_rol, corr_men)
         WHERE corr_rol IS NOT NULL AND corr_men IS NOT NULL`,
    );
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(ROL_MENU);
  await queryInterface.dropTable(MENUS);
  await queryInterface.dropTable(ROLES);
}
