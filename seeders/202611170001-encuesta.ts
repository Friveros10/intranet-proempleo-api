import { QueryTypes } from 'sequelize';
import { sequelize } from '../src/database/sequelize';
import { preguntasEncuesta } from '../src/services/encuesta.catalogo';

async function seed(): Promise<void> {
  await sequelize.transaction(async transaction => {
    const anterior = await sequelize.query(`SELECT TOP 1 id FROM dbo.preguntas
      WHERE (seccion = 2 AND orden > 9) OR (seccion = 3 AND orden > 2) OR (seccion = 4 AND orden > 3)`,
      { type: QueryTypes.SELECT, transaction });
    // Mantiene los identificadores existentes al volver a ejecutar el seeder.
    for (const [index, [seccion, pregunta, tipo, obligatoria, orden]] of preguntasEncuesta.entries()) {
      // Reconoce también el catálogo anterior, cuyo orden era global.
      await sequelize.query(`DECLARE @id INT;
        SELECT @id = id FROM dbo.preguntas WITH (UPDLOCK, HOLDLOCK)
          WHERE seccion = :seccion AND orden = :ordenBusqueda;
        IF @id IS NOT NULL
          UPDATE dbo.preguntas SET pregunta = :pregunta, tipo = :tipo,
            orden = :orden, obligatoria = :obligatoria WHERE id = @id;
        ELSE
        INSERT INTO dbo.preguntas (pregunta, seccion, tipo, orden, obligatoria)
        VALUES (:pregunta, :seccion, :tipo, :orden, :obligatoria)`, {
        replacements: { pregunta, seccion, tipo, orden, ordenBusqueda: anterior.length ? index + (index >= 3 ? 2 : 1) : orden, obligatoria },
        type: QueryTypes.RAW, transaction,
      });
    }
    // Conserva la pregunta retirada y sus respuestas históricas sin exigirla.
    await sequelize.query('UPDATE dbo.preguntas SET obligatoria = 0 WHERE seccion = 1 AND orden = 4', { transaction });
  });
}

seed().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => sequelize.close());
