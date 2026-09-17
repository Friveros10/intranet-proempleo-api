import { Sequelize } from 'sequelize';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/** Instancia única de Sequelize contra la base de datos legacy SICAP (SQL Server) */
export const sequelize = new Sequelize(env.sqlServer.database, env.sqlServer.user, env.sqlServer.password, {
  host: env.sqlServer.host,
  port: env.sqlServer.port,
  dialect: 'mssql',
  logging: false,
  dialectOptions: {
    options: {
      encrypt: env.sqlServer.encrypt,
      trustServerCertificate: env.sqlServer.trustServerCertificate,
    },
  },
  pool: {
    max: 10,
    min: 0,
    idle: 30000,
  },
});

export async function verificarConexionSequelize(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Conexión Sequelize a SQL Server establecida');
}
