import { DataTypes, QueryInterface } from "sequelize";

const tabla = { tableName: "flujo_reemplazo_proempleo", schema: "dbo" };

// Agrega el período habilitado (días del mes) por región al flujo de reemplazo.
// Los registros existentes quedan con los valores por defecto 20-28.
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.addColumn(tabla, "fechaDesde", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
    }, { transaction });
    await queryInterface.addColumn(tabla, "fechaHasta", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 28,
    }, { transaction });
    await queryInterface.sequelize.query(
      `ALTER TABLE dbo.flujo_reemplazo_proempleo ADD CONSTRAINT CK_flujo_reemplazo_fechaDesde CHECK (fechaDesde BETWEEN 1 AND 31)`,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE dbo.flujo_reemplazo_proempleo ADD CONSTRAINT CK_flujo_reemplazo_fechaHasta CHECK (fechaHasta BETWEEN 1 AND 31)`,
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.removeConstraint(tabla, "CK_flujo_reemplazo_fechaDesde", { transaction });
    await queryInterface.removeConstraint(tabla, "CK_flujo_reemplazo_fechaHasta", { transaction });
    await queryInterface.removeColumn(tabla, "fechaDesde", { transaction });
    await queryInterface.removeColumn(tabla, "fechaHasta", { transaction });
  });
}
