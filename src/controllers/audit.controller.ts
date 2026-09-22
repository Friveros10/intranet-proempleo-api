import { Request, Response } from 'express';
import { auditService } from '../services/audit.service';

export const auditController = {
  async listar(req: Request, res: Response): Promise<void> {
    const usuarioId = typeof req.query.usuarioId === 'string' ? req.query.usuarioId : undefined;
    const logs = await auditService.listar(usuarioId);
    res.status(200).json(logs);
  },

  async listarNotificaciones(req: Request, res: Response): Promise<void> {
    const notificaciones = await auditService.listarNotificaciones(req.user!.sub, req.user!.roles);
    res.status(200).json(notificaciones);
  },

  async marcarNotificacionesVistas(req: Request, res: Response): Promise<void> {
    const resultado = await auditService.marcarNotificacionesVistas(req.user!.sub, req.user!.roles);
    res.status(200).json(resultado);
  },
};
