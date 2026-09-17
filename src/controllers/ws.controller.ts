import { Request, Response } from 'express';
import { RshService } from '../services/rsh.service';

const rshService = new RshService();

export const wsController = {
  async consultarRsh(req: Request, res: Response): Promise<void> {
    const data = await rshService.consultar(req.params.rut);

    res.status(200).json({
      'detalle': data.detalle,
      'apellidoPaterno': data.rshmintrab.ape1,
      'apellidoMaterno': data.rshmintrab.ape2,
      'nombres': data.rshmintrab.nombres,
      'puntaje': data.rshmintrab.puntaje,
      'fecha': data.rshmintrab.fecha_nacimiento
    });
  },
};