import { Request } from 'express';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { compararPasswordLegacy } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { toSafeUsuarioSicap, UsuarioSicapSafe } from '../models/sicap/UsuarioSicap';
import { UsuarioSicapModel } from '../models/sicap/UsuarioSicap.model';
import { RolSicapModel } from '../models/sicap/RolSicap.model';
import { loginAttemptsTracker } from '../utils/loginAttempts';
import { logger } from '../utils/logger';

export interface LoginResult {
  usuario: UsuarioSicapSafe;
  roles: string[];
  permisos: string[];
  accessToken: string;
  refreshToken: string;
}

function rolesDe(usuario: UsuarioSicapModel): string[] {
  const rol = (usuario as UsuarioSicapModel & { rol?: RolSicapModel }).rol;
  return rol?.nom_rol ? [rol.nom_rol] : [];
}

export const authService = {
  async login(identificador: string, password: string, _req: Request): Promise<LoginResult> {
    const usuario = await usuarioSicapRepository.findByLogin(identificador);
    if (!usuario) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const rutUsu = usuario.rut_usu;

    if (loginAttemptsTracker.estaBloqueado(rutUsu)) {
      throw new AppError('Usuario bloqueado temporalmente por intentos fallidos', 423);
    }

    if (usuario.est_usu !== 'ACTIVO') {
      throw new AppError('Usuario inactivo', 403);
    }

    const passwordValida = compararPasswordLegacy(password, usuario.cla_usu);

    if (!passwordValida) {
      loginAttemptsTracker.registrarFallo(rutUsu);
      throw new AppError('Credenciales inválidas', 401);
    }

    loginAttemptsTracker.resetear(rutUsu);

    const roles = rolesDe(usuario);
    const permisos = await usuarioSicapRepository.getPermisosDeUsuario(rutUsu);

    const accessToken = signAccessToken({ sub: String(rutUsu), username: usuario.log_usu ?? '', roles });
    const refreshToken = signRefreshToken({ sub: String(rutUsu) });

    logger.info({ usuarioId: rutUsu }, 'Login exitoso');

    return {
      usuario: toSafeUsuarioSicap(usuario.get({ plain: true })),
      roles,
      permisos,
      accessToken,
      refreshToken,
    };
  },

  logout(_usuarioId: string | null, _req: Request): void {
  },

  async refresh(refreshToken: string, _req: Request): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Sesión expirada, inicie sesión nuevamente', 401);
    }

    const usuario = await usuarioSicapRepository.findByRut(Number(payload.sub));
    if (!usuario || usuario.est_usu !== 'ACTIVO') {
      throw new AppError('Sesión inválida', 401);
    }

    const roles = rolesDe(usuario);
    const newAccessToken = signAccessToken({ sub: String(usuario.rut_usu), username: usuario.log_usu ?? '', roles });
    const newRefreshToken = signRefreshToken({ sub: String(usuario.rut_usu) });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  async getSesionActual(
    usuarioId: string
  ): Promise<{ usuario: UsuarioSicapSafe; roles: string[]; permisos: string[] }> {
    const usuario = await usuarioSicapRepository.findByRut(Number(usuarioId));
    if (!usuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    const roles = rolesDe(usuario);
    const permisos = await usuarioSicapRepository.getPermisosDeUsuario(usuario.rut_usu);
    return { usuario: toSafeUsuarioSicap(usuario.get({ plain: true })), roles, permisos };
  },
};
