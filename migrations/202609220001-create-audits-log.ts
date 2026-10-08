import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

// Tabla propia de auditoría. No toca ninguna tabla legacy: usuarioId y region se
// guardan como enteros sueltos, sin claves foráneas.
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
  await queryInterface.createTable(
    { tableName: 'audits_log', schema: 'dbo' },
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      accion: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      modulo: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      entidad: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      registroId: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      region: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      detalle: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      ip: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      estadoAdmin: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      estadoMinisterio: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      estadoIntendencia: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      fechaVistaAdmin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fechaVistaMinisterio: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fechaVistaIntendencia: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }
  );

  for (const campo of ['fecha', 'region', 'estadoAdmin', 'estadoMinisterio', 'estadoIntendencia']) {
    const nombre = `IX_audits_log_${campo}`;
    if (!(await existeIndice(queryInterface, 'audits_log', nombre))) {
      await queryInterface.addIndex({ tableName: 'audits_log', schema: 'dbo' }, [campo], {
        name: nombre,
      });
    }
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable({ tableName: 'audits_log', schema: 'dbo' });
}