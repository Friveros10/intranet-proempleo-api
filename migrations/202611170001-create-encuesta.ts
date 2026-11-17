import { QueryInterface } from 'sequelize';

export async function up(qi: QueryInterface): Promise<void> {
  await qi.sequelize.transaction(async transaction => {
    await qi.sequelize.query(`CREATE TABLE dbo.preguntas (
      id INT IDENTITY(1,1) NOT NULL,
      pregunta NVARCHAR(MAX) NOT NULL,
      seccion INT NOT NULL,
      tipo VARCHAR(50) NOT NULL,
      orden INT NOT NULL,
      obligatoria BIT NOT NULL DEFAULT 1
    ); CREATE TABLE dbo.respuestas (
      id INT IDENTITY(1,1) NOT NULL,
      rut_ben VARCHAR(20) NULL,
      respuestas NVARCHAR(MAX) NOT NULL,
      Preguntas_id INT NOT NULL,
      regionId INT NULL,
      comunaId INT NULL,
      rut_ejecutor VARCHAR(20) NULL,
      fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`, { transaction });
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.dropTable({ schema: 'dbo', tableName: 'respuestas' });
  await qi.dropTable({ schema: 'dbo', tableName: 'preguntas' });
}
