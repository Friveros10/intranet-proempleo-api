export type AuditAccion =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'LOGIN_BLOCKED'
  | 'TOKEN_REFRESH'
  | 'TOKEN_REFRESH_FAILED'
  | 'REEMPLAZO_CREADO'
  | 'REEMPLAZO_APROBADO'
  | 'REEMPLAZO_RECHAZADO'
  | 'REEMPLAZO_ELIMINADO'
  | 'DOCUMENTO_CARGADO'
  | 'DOCUMENTO_APROBADO'
  | 'DOCUMENTO_RECHAZADO'
  | 'DOCUMENTO_REEMPLAZADO';

export type AuditEstadoNotificacion = 'pendiente' | 'vista';
export type AuditPerfilNotificacion = 'ADMIN' | 'MINISTERIO' | 'INTENDENCIA';

export interface AuditLog {
  id: number;
  usuarioId: number | null;
  accion: AuditAccion;
  modulo: string;
  entidad: string;
  registroId: string | null;
  region: number | null;
  fecha: string;
  ip: string | null;
  userAgent: string | null;
  detalle?: string | null;
  estadoAdmin: AuditEstadoNotificacion;
  estadoMinisterio: AuditEstadoNotificacion;
  estadoIntendencia: AuditEstadoNotificacion;
  fechaVistaAdmin: string | null;
  fechaVistaMinisterio: string | null;
  fechaVistaIntendencia: string | null;
}
