import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(
    { tableName: 'Doc_reemplazo_benpro', schema: 'dbo' },
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      idReemplazoBenProyecto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'Reemplazo_benpro', schema: 'dbo' }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      idDocumento: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      idBeneficiario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'BENEFICIARIOS', schema: 'dbo' }, key: 'rut_ben' },
      },
      nombreArchivo: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      archivoUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      fechaCarga: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable({ tableName: 'Doc_reemplazo_benpro', schema: 'dbo' });
}