import sql, { ConnectionPool } from 'mssql';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Pool de conexión a la base de datos SQL Server legacy (ProEmpleoDemo).
 * Se reutiliza una única promesa de conexión para toda la app.
 */
let poolPromise: Promise<ConnectionPool> | null = null;

const config: sql.config = {
  server: env.sqlServer.host,
  port: env.sqlServer.port,
  user: env.sqlServer.user,
  password: env.sqlServer.password,
  database: env.sqlServer.database,
  options: {
    encrypt: env.sqlServer.encrypt,
    trustServerCertificate: env.sqlServer.trustServerCertificate,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export function getSqlPool(): Promise<ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        logger.info('Conexión a SQL Server establecida');
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        logger.error({ err }, 'Error al conectar a SQL Server');
        throw err;
      });
  }
  return poolPromise;
}

export { sql };
