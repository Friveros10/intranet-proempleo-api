import { Request, Response } from 'express';
import { auditService } from '../services/audit.service';

export const auditController = {
  listar(req: Request, res: Response): void {
    const usuarioId = typeof req.query.usuarioId === 'string' ? req.query.usuarioId : undefined;
    res.status(200).json(auditService.listar(usuarioId));
  },
};
