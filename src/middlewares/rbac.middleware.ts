import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';

/**
 * Valida que el usuario autenticado posea al menos uno de los permisos requeridos.
 * Los permisos se recalculan desde la capa de datos en cada request (no se confía
 * únicamente en lo que viaja en el JWT). Los permisos provienen de los menús
 * (dbo.menus) habilitados para el rol del usuario (dbo.rol_menu).
 */
export function requirePermisos(...permisosRequeridos: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    try {
      const permisosUsuario = await usuarioSicapRepository.getPermisosDeUsuario(Number(req.user.sub));
      const tienePermiso = permisosRequeridos.some((p) => permisosUsuario.includes(p));

      if (!tienePermiso) {
        return next(new AppError('No tiene permisos suficientes', 403));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRoles(...rolesPermitidos: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    const tieneRol = req.user.roles.some((r) => rolesPermitidos.includes(r));
    if (!tieneRol) {
      return next(new AppError('No tiene el rol requerido', 403));
    }

    next();
  };
}
