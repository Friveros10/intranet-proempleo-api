import { AppError } from '../utils/AppError';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { reemplazoBenProyectoService } from './reemplazoBenProyecto.service';
import { flujoReemplazoService } from './flujoReemplazo.service';
import type { ReemplazoFiltros } from '../repositories/reemplazoBenProyecto.repository';

export async function exportarReemplazos(rut: number, roles: string[], filtros: ReemplazoFiltros) {
  const usuario = await usuarioSicapRepository.findByRut(rut);
  if (usuario?.log_usu?.trim() !== 'friveros') throw new AppError('No autorizado para exportar reemplazos', 403);
  const estados = ['aprobado', 'rechazado'].filter((estado) => !filtros.status || filtros.status === estado);
  const grupos = await Promise.all(estados.flatMap((estado) => {
    const query = { ...filtros, status: estado as 'aprobado' | 'rechazado' };
    return [
      reemplazoBenProyectoService.listar(query, rut, roles),
      flujoReemplazoService.listar(query, rut, roles).then((rows) => rows.map((row) => ({ ...row, flujo: 'B' }))),
    ];
  }));
  return grupos.flat().filter((row) => estados.includes(String(row.status)));
}
