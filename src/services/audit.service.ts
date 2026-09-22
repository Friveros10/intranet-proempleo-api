import { auditLogRepository } from '../repositories/auditLog.repository';
import { AuditLog, AuditPerfilNotificacion } from '../models/AuditLog';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { AppError } from '../utils/AppError';

function obtenerPerfilNotificaciones(roles: string[]): AuditPerfilNotificacion {
  if (roles.includes('ADMIN')) return 'ADMIN';
  if (roles.includes('MINISTERIO')) return 'MINISTERIO';
  if (roles.includes('INTENDENCIA')) return 'INTENDENCIA';
  throw new AppError('No tiene acceso a notificaciones', 403);
}

async function obtenerRegionSiAplica(usuarioId: string, perfil: AuditPerfilNotificacion): Promise<number | null> {
  if (perfil !== 'INTENDENCIA') return null;
  const usuario = await usuarioSicapRepository.findByRut(Number(usuarioId));
  return usuario?.reg_usu ?? -1;
}

export const auditService = {
  listar(usuarioId?: string): Promise<AuditLog[]> {
    return usuarioId ? auditLogRepository.findByUsuarioId(usuarioId) : auditLogRepository.findAll();
  },

  async listarNotificaciones(usuarioId: string, roles: string[]): Promise<AuditLog[]> {
    const perfil = obtenerPerfilNotificaciones(roles);
    const regionUsuario = await obtenerRegionSiAplica(usuarioId, perfil);
    return auditLogRepository.listarNotificaciones(perfil, regionUsuario);
  },

  async marcarNotificacionesVistas(usuarioId: string, roles: string[]): Promise<{ actualizadas: number }> {
    const perfil = obtenerPerfilNotificaciones(roles);
    const regionUsuario = await obtenerRegionSiAplica(usuarioId, perfil);
    const actualizadas = await auditLogRepository.marcarNotificacionesVistas(perfil, regionUsuario);
    return { actualizadas };
  },
};
