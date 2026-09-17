import { Request, Response } from 'express';
import { beneficiarioService } from '../services/beneficiario.service';

export const beneficiarioController = {
  async ficha(req: Request, res: Response): Promise<void> {
    const ficha = await beneficiarioService.buscarFichaPorRut(req.params.rut);
    res.status(200).json(ficha);
  },

  async activo(req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.buscarActivoPorRut(req.params.rut);
    res.status(200).json(data);
  },
};
