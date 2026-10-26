import { Request, Response } from 'express';
import { decretosHaciendaService as service } from '../services/decretosHacienda.service';
import { guardarDecretoHaciendaSchema, listarDecretosHaciendaSchema, obtenerDecretoHaciendaSchema } from '../validations/decretosHacienda.validation';
import { AppError } from '../utils/AppError';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const decretosHaciendaController = {
  async listar(req: Request, res: Response) {
    const { query } = listarDecretosHaciendaSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },
  async anios(_req: Request, res: Response) {
    res.json(await service.anios());
  },
  async programas(_req: Request, res: Response) {
    res.json(await service.programas());
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerDecretoHaciendaSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.folio, query.origen));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarDecretoHaciendaSchema.parse({ body: req.body });
    res.status(201).json(await service.crear(body, usuario(req)));
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarDecretoHaciendaSchema.parse({ body: req.body });
    res.json(await service.actualizar(req.params.folio, body, usuario(req)));
  },
};
