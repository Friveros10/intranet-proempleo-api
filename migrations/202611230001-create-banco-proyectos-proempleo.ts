import type { QueryInterface } from "sequelize";

export async function up({ sequelize }: QueryInterface): Promise<void> {
  await sequelize.query(`
    CREATE TABLE dbo.banco_proyectos_proempleo (
      id INT IDENTITY(21, 1) PRIMARY KEY,
      nombre_proyecto NVARCHAR(300) NOT NULL,
      alcance NVARCHAR(2000) NOT NULL,
      categoria NVARCHAR(150) NOT NULL,
      eliminado BIT NOT NULL DEFAULT 0
    );
  `);
}

export async function down({ sequelize }: QueryInterface): Promise<void> {
  await sequelize.query("DROP TABLE dbo.banco_proyectos_proempleo");
}
