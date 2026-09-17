import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { verificarConexionSequelize } from './database/sequelize';
import { registrarAsociaciones } from './database/sicapAssociations';
import { ReemplazoBenProyectoModel } from './models/ReemplazoBenProyecto.model';
import { DocReemplazoBenProyectoModel } from './models/DocReemplazoBenProyecto.model';

async function bootstrap(): Promise<void> {
  registrarAsociaciones();
  await verificarConexionSequelize();

  // Solo se sincronizan las tablas propias de la app (nunca las tablas legacy de SICAP)
  // No se usa alter:true: Sequelize genera SQL inválido para mssql al tocar columnas con default (ver migraciones manuales)
  await ReemplazoBenProyectoModel.sync();
  await DocReemplazoBenProyectoModel.sync();

  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`API escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Error al iniciar la aplicación');
  process.exit(1);
});
