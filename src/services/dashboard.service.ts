import { dashboardRepository as repository } from '../repositories/dashboard.repository';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { AppError } from '../utils/AppError';
import type { DashboardQuery } from '../validations/dashboard.validation';

export const dashboardService = {
  async obtener(query: DashboardQuery, usuario: number, roles: string[]) {
    const global = roles.some((r) => ['ADMIN', 'MINISTERIO'].includes(r.trim().toUpperCase()));
    let region = query.region;
    if (!global) {
      const ficha = await usuarioSicapRepository.findByRut(usuario);
      region = Number(ficha?.reg_usu);
      if (!Number.isInteger(region) || region <= 0) throw new AppError('El usuario no tiene una región asignada', 403);
      if (query.region !== undefined && query.region !== region) throw new AppError('Solo puede consultar su región', 403);
    }
    if (query.comuna !== undefined && region === undefined) throw new AppError('Seleccione una región para filtrar por comuna', 400);
    const opciones = await repository.opciones(region, global);
    if (query.comuna !== undefined && !opciones.comunas.some((c) => c.codigo === query.comuna)) {
      throw new AppError('La comuna no pertenece a la región seleccionada', 403);
    }
    const datos = await repository.obtener({ ...query, region });
    return { ...datos, opciones, filtros: { anio: query.anio, mes: query.mes, region: region ?? null, comuna: query.comuna ?? null }, puedeFiltrarRegion: global };
  },
};
