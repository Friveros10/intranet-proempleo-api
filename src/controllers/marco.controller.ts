import { Request, Response } from 'express';
import { marcoService } from '../services/marco.service';
import { listarMarcosSchema } from '../validations/marco.validation';

export const marcoController = {
  async listar(req: Request, res: Response) {
    const { query } = listarMarcosSchema.parse({ query: req.query });
    res.json(await marcoService.listar(query));
  },

  async anios(_req: Request, res: Response) {
    res.json(await marcoService.anios());
  },

  async obtener(req: Request, res: Response) {
    res.json(await marcoService.obtener(Number(req.params.id)));
  },
};
