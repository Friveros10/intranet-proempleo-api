import type { Request, Response } from 'express';
import { transferenciasService as service } from '../services/transferencias.service';
import { AppError } from '../utils/AppError';
import {
  buscarDecretoTransferenciaSchema, listarTransferenciasSchema,
  proyectosTransferenciaSchema, registrarTransferenciaSchema,
} from '../validations/transferencias.validation';

export const transferenciasController = {
  async buscarDecreto(req: Request, res: Response) {
    const { params } = buscarDecretoTransferenciaSchema.parse({ params: req.params });
    res.json(await service.buscarDecreto(params.decreto));
  },

  async proyectos(req: Request, res: Response) {
    const { params, query } = proyectosTransferenciaSchema.parse({ params: req.params, query: req.query });
    res.json(await service.proyectos(params.decreto, query));
  },

  async listar(req: Request, res: Response) {
    const { params, query } = listarTransferenciasSchema.parse({ params: req.params, query: req.query });
    res.json(await service.listar(params.ordinario, query));
  },

  async registrar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError('Sesión inválida.', 401);
    const { params, body } = registrarTransferenciaSchema.parse({ params: req.params, body: req.body });
    res.status(201).json(await service.registrar(params.ordinario, body, req.user.sub));
  },
};
