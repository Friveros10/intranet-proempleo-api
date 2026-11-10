import { Request, Response } from 'express';
import { decretosService as service } from '../services/decretos.service';
import { guardarDecretoSchema, listarDecretosSchema, obtenerDecretoSchema } from '../validations/decretos.validation';
import { AppError } from '../utils/AppError';
import { desvincularProyectoDecretoSchema } from '../validations/decretos.validation';
import { proyectosDecretoSchema, asociarProyectoDecretoSchema, buscarProyectoDecretoSchema } from '../validations/decretos.validation';

export const decretosController = {
  async desvincularProyecto(req: Request, res: Response) {
    const { params, query } = desvincularProyectoDecretoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.desvincularProyecto(params.folio, query.origen, params.proyecto, query.origenProyecto, usuario(req)));
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
    res.status(201).json(await service.asociarProyecto(params.folio, query.origen, body, usuario(req)));
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
  async programas(_req: Request, res: Response) {
    res.json(await service.programas());
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerDecretoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.folio, query.origen));
  },
  async glosas(req: Request, res: Response) {
    res.json(await service.glosas(Number(req.params.id)));
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
