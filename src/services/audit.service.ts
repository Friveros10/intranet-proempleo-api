import { auditLogRepository } from '../repositories/auditLog.repository';
import { AuditLog } from '../models/AuditLog';

export const auditService = {
  listar(usuarioId?: string): AuditLog[] {
    return usuarioId ? auditLogRepository.findByUsuarioId(usuarioId) : auditLogRepository.findAll();
  },
};
