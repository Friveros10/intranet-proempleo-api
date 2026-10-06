import { DataTypes, QueryInterface } from 'sequelize';

const table = { tableName: 'documentos_auditoria', schema: 'dbo' };

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
    await queryInterface.addConstraint(table, {
      fields: [field],
      type: 'check',
      name: `CK_documentos_auditoria_${field}`,
      where: { [field]: ['pendiente', 'rechazado', 'aprobado'] },
    });
  }
  await queryInterface.addIndex(table, ['idRegion', 'deleted_at'], {
    name: 'IX_documentos_auditoria_region',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(table);
}
