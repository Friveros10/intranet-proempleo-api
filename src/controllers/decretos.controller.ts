import { Request, Response } from 'express';
import { decretosService as service } from '../services/decretos.service';
import { listarDecretosSchema } from '../validations/decretos.validation';
import { AppError } from '../utils/AppError';

export const decretosController = {
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
    res.json(await service.obtener(req.params.folio));
  },
};
