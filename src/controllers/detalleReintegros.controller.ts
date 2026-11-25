import type { Request, Response } from 'express';
import { detalleReintegrosService as service } from '../services/detalleReintegros.service';
import { AppError } from '../utils/AppError';
import { crearReintegroSchema, editarReintegroSchema, listarReintegrosSchema, proyectoReintegroSchema, reintegroProempleoSchema } from '../validations/detalleReintegros.validation';

function usuario(req: Request) {
  if (!req.user?.sub) throw new AppError('Sesión inválida.', 401);
  return req.user.sub;
}

export const detalleReintegrosController = {
  async listar(req: Request, res: Response) {
    const { query } = listarReintegrosSchema.parse(req);
    res.json(await service.listar(query));
  },
  async buscarProyecto(req: Request, res: Response) {
    const { query } = proyectoReintegroSchema.parse(req);
    res.json(await service.buscarProyecto(query.decreto, query.folio));
  },
  async crear(req: Request, res: Response) {
    const { body } = crearReintegroSchema.parse(req);
    res.status(201).json(await service.crear(body, usuario(req)));
  },
  async editar(req: Request, res: Response) {
    const { params, body } = editarReintegroSchema.parse(req);
    res.json(await service.cambiar(params.id, body, usuario(req)));
  },
  async eliminar(req: Request, res: Response) {
    const { params } = reintegroProempleoSchema.parse(req);
    res.json(await service.cambiar(params.id, null, usuario(req)));
  },
};
