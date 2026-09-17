import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[env.cookies.accessTokenName];

  if (!token) {
    return next(new AppError('No autenticado', 401));
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return next(new AppError('Sesión inválida o expirada', 401));
  }
}
