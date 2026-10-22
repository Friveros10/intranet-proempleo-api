import { Request, Response } from 'express';
import { decretosHaciendaService as service } from '../services/decretosHacienda.service';
import { listarDecretosHaciendaSchema } from '../validations/decretosHacienda.validation';

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
    res.json(await service.obtener(req.params.folio));
  },
};
