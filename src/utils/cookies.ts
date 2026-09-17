import { Response } from 'express';
import { env } from '../config/env';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(env.cookies.accessTokenName, accessToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
  });

  res.cookie(env.cookies.refreshTokenName, refreshToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api/auth/refresh',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(env.cookies.accessTokenName, { path: '/' });
  res.clearCookie(env.cookies.refreshTokenName, { path: '/api/auth/refresh' });
}
