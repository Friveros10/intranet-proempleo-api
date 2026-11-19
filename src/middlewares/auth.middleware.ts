import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';
import { env } from '../config/env';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[env.cookies.accessTokenName];

  if (!token) {
    return next(new AppError('No autenticado', 401));
  }

  let usuario: AccessTokenPayload;
  try {
    usuario = verifyAccessToken(token);
  } catch {
    return next(new AppError('Sesión inválida o expirada', 401));
  }

  try {
    if (!await usuarioSicapRepository.estaActivo(Number(usuario.sub))) {
      return next(new AppError('Sesión inválida o expirada', 401));
    }
    req.user = usuario;
    next();
  } catch (error) {
    next(error);
  }
}
