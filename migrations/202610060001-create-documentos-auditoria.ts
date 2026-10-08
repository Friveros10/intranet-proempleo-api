import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

// Tabla propia de documentos de auditoría. No declara claves foráneas hacia
// tablas legacy: RUT, idComuna, idRegion y los *_usr son enteros sueltos.
const table = { tableName: 'documentos_auditoria', schema: 'dbo' };

async function existeObjeto(
  queryInterface: QueryInterface,
  nombre: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ existe: number }>(
    `SELECT CASE WHEN OBJECT_ID('dbo.${nombre}') IS NULL THEN 0 ELSE 1 END AS existe`,
    { type: QueryTypes.SELECT },
  );
  return row.existe === 1;
}

async function existeIndice(
  queryInterface: QueryInterface,
  nombre: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ existe: number }>(
    `SELECT CASE WHEN EXISTS (
       SELECT 1 FROM sys.indexes
       WHERE name = '${nombre}' AND object_id = OBJECT_ID('dbo.documentos_auditoria')
     ) THEN 1 ELSE 0 END AS existe`,
    { type: QueryTypes.SELECT },
  );
  return row.existe === 1;
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(table, {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    RUT: { type: DataTypes.INTEGER, allowNull: false },
    dv: { type: DataTypes.STRING(1), allowNull: false },
    nombres: { type: DataTypes.STRING(255), allowNull: false },
    apellidoPaterno: { type: DataTypes.STRING(255), allowNull: false },
    apellidoMaterno: { type: DataTypes.STRING(255), allowNull: false },
    ong: { type: DataTypes.STRING(255), allowNull: false },
    idComuna: { type: DataTypes.INTEGER, allowNull: false },
    idRegion: { type: DataTypes.INTEGER, allowNull: false },
    certCotizacionesUrl: { type: DataTypes.STRING(500), allowNull: false },
    liquidacionUrl: { type: DataTypes.STRING(500), allowNull: false },
    certCotizacionesNombre: { type: DataTypes.STRING(255), allowNull: false },
    liquidacionNombre: { type: DataTypes.STRING(255), allowNull: false },
    estadoCert: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
    estadoLiquidacion: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
    comentarioCert: { type: DataTypes.STRING(1000), allowNull: true },
    comentarioLiquidacion: { type: DataTypes.STRING(1000), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    created_usr: { type: DataTypes.INTEGER, allowNull: false },
    updated_usr: { type: DataTypes.INTEGER, allowNull: false },
    deleted_usr: { type: DataTypes.INTEGER, allowNull: true },
  });
  for (const field of ['estadoCert', 'estadoLiquidacion']) {
    const nombre = `CK_documentos_auditoria_${field}`;
    if (!(await existeObjeto(queryInterface, nombre))) {
      await queryInterface.addConstraint(table, {
        fields: [field],
        type: 'check',
        name: nombre,
        where: { [field]: ['pendiente', 'rechazado', 'aprobado'] },
      });
    }
  }
  if (!(await existeIndice(queryInterface, 'IX_documentos_auditoria_region'))) {
    await queryInterface.addIndex(table, ['idRegion', 'deleted_at'], {
      name: 'IX_documentos_auditoria_region',
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(table);
}
