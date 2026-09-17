export type AuditAccion =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'LOGIN_BLOCKED'
  | 'TOKEN_REFRESH'
  | 'TOKEN_REFRESH_FAILED';

export interface AuditLog {
  id: string;
  usuarioId: string | null;
  accion: AuditAccion;
  entidad: string;
  registroId: string | null;
  fecha: string;
  ip: string;
  userAgent: string;
  detalle?: string;
}
