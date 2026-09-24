import { Request, Response } from 'express';
import { planEgresoHistoricoService } from '../services/planEgresoHistorico.service';

export const planEgresoHistoricoController = {
  async buscarPorRut(req: Request, res: Response): Promise<void> {
    const data = await planEgresoHistoricoService.buscarPorRut(req.params.rut);
    if (!data) {
      res.status(204).send();
      return;
    }
    res.status(200).json(data);
  },
};
