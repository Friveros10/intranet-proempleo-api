import { Request, Response } from 'express';
import { marcoService } from '../services/marco.service';
import { guardarMarcoSchema, listarMarcosSchema, obtenerMarcoSchema } from '../validations/marco.validation';
import { AppError } from '../utils/AppError';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,15}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const marcoController = {
  async listar(req: Request, res: Response) {
    const { query } = listarMarcosSchema.parse({ query: req.query });
    res.json(await marcoService.listar(query));
  },

  async anios(_req: Request, res: Response) {
    res.json(await marcoService.anios());
  },

  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerMarcoSchema.parse({ params: req.params, query: req.query });
    res.json(await marcoService.obtener(params.id, query.origen));
  },

  async crear(req: Request, res: Response) {
    const { body } = guardarMarcoSchema.parse({ body: req.body });
    res.status(201).json(await marcoService.crear(body, usuario(req)));
  },

  async actualizar(req: Request, res: Response) {
    const { body } = guardarMarcoSchema.parse({ body: req.body });
    res.json(await marcoService.actualizar(Number(req.params.id), body, usuario(req)));
  },
};
