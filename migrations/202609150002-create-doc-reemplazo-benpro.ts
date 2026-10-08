import { DataTypes, QueryInterface } from 'sequelize';

// Documentos asociados a un reemplazo. Se crea con su esquema final.
//
// La única clave foránea apunta a dbo.Reemplazo_benpro, que también es una tabla
// propia. No se declara FK hacia BENEFICIARIOS porque el beneficiario puede
// existir solo en dbo.beneficiarios_proempleo.
const table = { tableName: 'Doc_reemplazo_benpro', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(table, {
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
    comentarioRechazo: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    fechaCarga: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable(table);
}
