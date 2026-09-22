import { Request } from 'express';
import { WhereOptions } from 'sequelize';
import { AuditAccion, AuditPerfilNotificacion } from '../models/AuditLog';
import { AuditLogModel } from '../models/AuditLog.model';

export interface RegistrarAuditoriaParams {
  usuarioId: string | number | null;
  accion: AuditAccion;
  modulo?: string;
  entidad: string;
  registroId?: string | null;
  region?: number | null;
  detalle?: string;
  req: Request;
}

const ESTADO_POR_PERFIL: Record<AuditPerfilNotificacion, 'estadoAdmin' | 'estadoMinisterio' | 'estadoIntendencia'> = {
  ADMIN: 'estadoAdmin',
  MINISTERIO: 'estadoMinisterio',
  INTENDENCIA: 'estadoIntendencia',
};

const FECHA_VISTA_POR_PERFIL: Record<AuditPerfilNotificacion, 'fechaVistaAdmin' | 'fechaVistaMinisterio' | 'fechaVistaIntendencia'> = {
  ADMIN: 'fechaVistaAdmin',
  MINISTERIO: 'fechaVistaMinisterio',
  INTENDENCIA: 'fechaVistaIntendencia',
};

function buildWhereNotificaciones(perfil: AuditPerfilNotificacion, regionUsuario?: number | null): WhereOptions {
  const estado = ESTADO_POR_PERFIL[perfil];
  return {
    [estado]: 'pendiente',
    ...(perfil === 'INTENDENCIA' ? { region: regionUsuario ?? -1 } : {}),
  };
}

export const auditLogRepository = {
  async registrar({ usuarioId, accion, modulo, entidad, registroId, region, detalle, req }: RegistrarAuditoriaParams): Promise<AuditLogModel> {
    return AuditLogModel.create({
      usuarioId: usuarioId === null ? null : Number(usuarioId),
      accion,
      modulo: modulo ?? entidad,
      entidad,
      registroId: registroId ?? null,
      region: region ?? null,
      fecha: new Date().toISOString(),
      ip: req.ip ?? req.socket.remoteAddress ?? null,
      userAgent: req.get('user-agent') ?? null,
      detalle: detalle ?? null,
      estadoAdmin: 'pendiente',
      estadoMinisterio: 'pendiente',
      estadoIntendencia: 'pendiente',
      fechaVistaAdmin: null,
      fechaVistaMinisterio: null,
      fechaVistaIntendencia: null,
    });
  },

  async findAll(): Promise<AuditLogModel[]> {
    return AuditLogModel.findAll({ order: [['fecha', 'DESC']] });
  },

  async findByUsuarioId(usuarioId: string): Promise<AuditLogModel[]> {
    return AuditLogModel.findAll({ where: { usuarioId: Number(usuarioId) }, order: [['fecha', 'DESC']] });
  },

  async listarNotificaciones(perfil: AuditPerfilNotificacion, regionUsuario?: number | null): Promise<AuditLogModel[]> {
    return AuditLogModel.findAll({
      where: buildWhereNotificaciones(perfil, regionUsuario),
      order: [['fecha', 'DESC']],
      limit: 30,
    });
  },

  async marcarNotificacionesVistas(perfil: AuditPerfilNotificacion, regionUsuario?: number | null): Promise<number> {
    const estado = ESTADO_POR_PERFIL[perfil];
    const fechaVista = FECHA_VISTA_POR_PERFIL[perfil];
    const [actualizadas] = await AuditLogModel.update(
      { [estado]: 'vista', [fechaVista]: new Date().toISOString() },
      { where: buildWhereNotificaciones(perfil, regionUsuario) }
    );
    return actualizadas;
  },
};
