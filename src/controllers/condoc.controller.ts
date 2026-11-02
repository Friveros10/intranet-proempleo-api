import { Request, Response } from 'express';
import { condocService as service } from '../services/condoc.service';
import {
  cambiarEstadoCondocSchema,
  guardarCondocSchema,
  listarCondocSchema,
  obtenerCondocSchema,
  programasCondocSchema,
} from '../validations/condoc.validation';
import { AppError } from '../utils/AppError';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const condocController = {
  async listar(req: Request, res: Response) {
    const { query } = listarCondocSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },
  async anios(_req: Request, res: Response) {
    res.json(await service.anios());
  },
  async areas(_req: Request, res: Response) {
    res.json(await service.areas());
  },
  async programasAnios(_req: Request, res: Response) {
    res.json(await service.programasAnios());
  },
  async programas(req: Request, res: Response) {
    const { query } = programasCondocSchema.parse({ query: req.query });
    res.json(await service.programas(query.anio));
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerCondocSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.id, query.origen));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarCondocSchema.parse({ body: req.body });
    res.status(201).json(await service.crear(body, usuario(req)));
  },
  async avanzarEstado(req: Request, res: Response) {
    const { params } = cambiarEstadoCondocSchema.parse({ params: req.params });
    res.json(await service.avanzarEstado(params.id, usuario(req)));
  },
};
