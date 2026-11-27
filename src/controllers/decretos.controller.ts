import { Request, Response } from 'express';
import { decretosService as service } from '../services/decretos.service';
import { glosasDecretoSchema, guardarDecretoSchema, listarDecretosSchema, obtenerDecretoSchema, programasDecretoSchema } from '../validations/decretos.validation';
import { AppError } from '../utils/AppError';
import { desvincularProyectoDecretoSchema } from '../validations/decretos.validation';
import { proyectosDecretoSchema, asociarProyectoDecretoSchema, buscarProyectoDecretoSchema } from '../validations/decretos.validation';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';

const auditoriaAsignaciones = { modulo: 'DECRETOS_Y_RESOLUCIONES', entidad: 'DECPRO_PROEMPLEO' };

export const decretosController = {
  async desvincularProyecto(req: Request, res: Response) {
    const { params, query } = desvincularProyectoDecretoSchema.parse({ params: req.params, query: req.query });
    const usuarioId = usuario(req);
    const { asociacion, region } = await service.desvincularProyecto(params.folio, query.origen, params.proyecto, query.origenProyecto, usuarioId);
    registrarAuditoriaOpcional({
      ...auditoriaAsignaciones, req, usuarioId, region,
      accion: 'DECRETO_PROYECTO_DESVINCULADO', registroId: `${asociacion.fol_dec}:${asociacion.fol_pro}`,
      detalle: `Proyecto ${asociacion.fol_pro} desvinculado del decreto ${asociacion.fol_dec}. Asociación marcada como ELIMINADO.`,
    });
    res.json(asociacion);
  },
  async buscarProyecto(req: Request, res: Response) {
    const { params, query } = buscarProyectoDecretoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.buscarProyecto(params.folio, query.origen, query.fol_pro));
  },
  async proyectos(req: Request, res: Response) {
    const { params, query } = proyectosDecretoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.proyectos(params.folio, query, false));
  },
  async proyectosDisponibles(req: Request, res: Response) {
    const { params, query } = proyectosDecretoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.proyectos(params.folio, query, true));
  },
  async asociarProyecto(req: Request, res: Response) {
    const { params, query } = proyectosDecretoSchema.parse({ params: req.params, query: req.query });
    const { body } = asociarProyectoDecretoSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const { asociacion, region } = await service.asociarProyecto(params.folio, query.origen, body, usuarioId);
    registrarAuditoriaOpcional({
      ...auditoriaAsignaciones, req, usuarioId, region,
      accion: 'DECRETO_PROYECTO_ASOCIADO', registroId: `${asociacion.fol_dec}:${asociacion.fol_pro}`,
      detalle: `Proyecto ${asociacion.fol_pro} asociado al decreto ${asociacion.fol_dec}. Monto asignado ${body.mon_decpro} CLP.`,
    });
    res.status(201).json(asociacion);
  },
  async intermediarios(req: Request, res: Response) {
    if (!req.user) throw new AppError('No autenticado', 401);
    const rut = Number(req.user.sub);
    if (!Number.isSafeInteger(rut) || rut <= 0) throw new AppError('Sesión inválida', 401);
    res.json(await service.intermediarios(rut));
  },
  async listar(req: Request, res: Response) {
    const { query } = listarDecretosSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },
  async anios(_req: Request, res: Response) {
    res.json(await service.anios());
  },
  async programas(req: Request, res: Response) {
    const { query } = programasDecretoSchema.parse({ query: req.query });
    res.json(await service.programas(query.anio));
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerDecretoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.folio, query.origen));
  },
  async glosas(req: Request, res: Response) {
    const { params, query } = glosasDecretoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.glosas(params.id, query.anio));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarDecretoSchema.parse({ body: req.body });
    res.status(201).json(await service.crear(body, usuario(req)));
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarDecretoSchema.parse({ body: req.body });
    res.json(await service.actualizar(req.params.folio, body, usuario(req)));
  },
};

function usuario(req: Request) {
  if (!req.user || !/^\d{1,15}$/.test(req.user.sub) || !Number.isSafeInteger(Number(req.user.sub))) {
    throw new AppError('Sesión inválida', 401);
  }
  return req.user.sub;
}
