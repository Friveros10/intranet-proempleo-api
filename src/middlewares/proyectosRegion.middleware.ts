import { Request, Response } from 'express';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { proyectosService } from '../services/proyectos.service';
import { AppError } from '../utils/AppError';

export async function limitarRegionProyectos(req: Request, res: Response, next: () => void) {
  if (req.user?.roles.some((rol) => ['ADMIN', 'MINISTERIO'].includes(rol))) return next();
  const usuario = await usuarioSicapRepository.findByRut(Number(req.user?.sub));
  const region = Number(usuario?.reg_usu);
  if (!Number.isInteger(region) || region <= 0) throw new AppError('El usuario no tiene una región asignada', 403);
  res.locals.regionProyectos = region;
  const folio = req.path.match(/^\/(?:proempleo\/)?(\d+)(?:\/|$)/)?.[1];
  if (folio) {
    const escritura = req.method !== 'GET' || req.path.includes('/buscar');
    const origen = escritura || req.path.startsWith('/proempleo/') || req.query.origen === 'proempleo' ? 'proempleo' : 'legacy';
    const proyecto = await proyectosService.obtener(Number(folio), origen);
    if (Number(proyecto.reg_pro) !== region) throw new AppError('El proyecto no pertenece a su región', 403);
  }
  for (const campo of ['reg_pro', 'reg_res']) {
    if (req.body?.[campo] !== undefined && Number(req.body[campo]) !== region) throw new AppError('Solo puede registrar datos de su región', 403);
  }
  if (req.query.region !== undefined && Number(req.query.region) !== region) throw new AppError('Solo puede consultar su región', 403);
  if (req.query.comuna !== undefined || req.query.ciudad !== undefined) {
    const comunas = await proyectosService.comunas({ region });
    if (req.query.comuna !== undefined && !comunas.some((c) => Number(c.cod_com) === Number(req.query.comuna))) throw new AppError('La comuna no pertenece a su región', 403);
    if (req.query.ciudad !== undefined && !comunas.some((c) => Number(c.cod_ciu) === Number(req.query.ciudad))) throw new AppError('La provincia no pertenece a su región', 403);
  }
  next();
}
