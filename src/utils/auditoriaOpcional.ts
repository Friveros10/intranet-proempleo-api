import { auditLogRepository, type RegistrarAuditoriaParams } from '../repositories/auditLog.repository';
import { logger } from './logger';

const MAX_AUDITORIAS_EN_CURSO = 2;
let auditoriasEnCurso = 0;

// La auditoría opcional no espera conexiones en la petición ni ocupa todo el pool.
export function registrarAuditoriaOpcional(datos: Omit<RegistrarAuditoriaParams, 'transaction'>): void {
  const contexto = { accion: datos.accion, modulo: datos.modulo, registroId: datos.registroId };
  if (auditoriasEnCurso >= MAX_AUDITORIAS_EN_CURSO) {
    logger.warn(contexto, 'Auditoría omitida por saturación');
    return;
  }

  auditoriasEnCurso++;
  void Promise.resolve()
    .then(() => auditLogRepository.registrar(datos))
    .catch((error: unknown) => {
      const tipoError = error instanceof Error ? error.name : 'Error';
      logger.warn({ ...contexto, tipoError }, 'No se pudo registrar la auditoría');
    })
    .finally(() => { auditoriasEnCurso--; });
}
