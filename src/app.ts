import express, { Express } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
// import { globalRateLimiter } from './middlewares/rateLimit.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import routes from './routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.cors.origin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));
  // Límite de solicitudes deshabilitado temporalmente
  // app.use(globalRateLimiter);
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: env.nodeEnv });
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
