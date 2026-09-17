import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { identificador, password } = req.body;
    const resultado = await authService.login(identificador, password, req);

    setAuthCookies(res, resultado.accessToken, resultado.refreshToken);

    res.status(200).json({
      usuario: resultado.usuario,
      roles: resultado.roles,
      permisos: resultado.permisos,
    });
  },

  logout(req: Request, res: Response): void {
    authService.logout(req.user?.sub ?? null, req);
    clearAuthCookies(res);
    res.status(200).json({ message: 'Sesión cerrada correctamente' });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[env.cookies.refreshTokenName];
    if (!refreshToken) {
      throw new AppError('No hay sesión activa', 401);
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken, req);
    setAuthCookies(res, accessToken, newRefreshToken);
    res.status(200).json({ message: 'Token renovado', accessToken, refreshToken: newRefreshToken });
  },

  async sesion(req: Request, res: Response): Promise<void> {
    const data = await authService.getSesionActual(req.user!.sub);
    res.status(200).json(data);
  },
};
