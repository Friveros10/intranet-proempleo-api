import { Request, Response } from 'express';
import { rolSicapRepository } from '../repositories/sicap/rolSicap.repository';

export const sicapController = {
  async health(_req: Request, res: Response): Promise<void> {
    const roles = await rolSicapRepository.findAll();
    res.status(200).json({ ok: true, database: 'ProEmpleoDemo', rolesCount: roles.length });
  },
};
