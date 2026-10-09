import { Request, Response } from 'express';
import { proyectoService } from '../services/proyecto.service';

export const proyectoController = {
  async buscarPorFolio(req: Request, res: Response): Promise<void> {
    const folio = Number(req.params.folio);
    const proyecto = await proyectoService.buscarPorFolio(
      folio,
      Number(req.user!.sub),
    );
    res.status(200).json(proyecto);
  },
};
