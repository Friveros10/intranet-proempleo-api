import { Request } from 'express';
import { auditLog, nextId, timestamp } from '../database/inMemoryDb';
import { AuditAccion, AuditLog } from '../models/AuditLog';

export interface RegistrarAuditoriaParams {
  usuarioId: string | null;
  accion: AuditAccion;
  entidad: string;
  registroId?: string | null;
  detalle?: string;
  req: Request;
}

export const auditLogRepository = {
  registrar({ usuarioId, accion, entidad, registroId, detalle, req }: RegistrarAuditoriaParams): AuditLog {
    const entry: AuditLog = {
      id: nextId('audit'),
      usuarioId,
      accion,
      entidad,
      registroId: registroId ?? null,
      fecha: timestamp(),
      ip: req.ip ?? req.socket.remoteAddress ?? 'desconocida',
      userAgent: req.get('user-agent') ?? 'desconocido',
      detalle,
    };
    auditLog.push(entry);
    return entry;
  },

  findAll(): AuditLog[] {
    return auditLog;
  },

  findByUsuarioId(usuarioId: string): AuditLog[] {
    return auditLog.filter((a) => a.usuarioId === usuarioId);
  },
};
