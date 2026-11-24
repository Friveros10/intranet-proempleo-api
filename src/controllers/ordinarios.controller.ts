import type { Request, Response } from 'express';
import { ordinariosService as service } from '../services/ordinarios.service';
import { AppError } from '../utils/AppError';
import {
  crearOrdinarioSchema, listarOrdinariosSchema, obtenerOrdinarioSchema,
} from '../validations/ordinarios.validation';

export const ordinariosController = {
  async listar(req: Request, res: Response) {
    const { query } = listarOrdinariosSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },

  async obtener(req: Request, res: Response) {
    const { params } = obtenerOrdinarioSchema.parse({ params: req.params });
    res.json(await service.obtener(params.ordinario));
  },

  async crear(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError('Sesión inválida.', 401);
    const { body } = crearOrdinarioSchema.parse({ body: req.body });
    res.status(201).json(await service.crear(body, req.user.sub));
  },
};
