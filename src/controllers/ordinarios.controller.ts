import type { Request, Response } from 'express';
import { ordinariosService as service } from '../services/ordinarios.service';
import { AppError } from '../utils/AppError';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';
import {
  crearOrdinarioSchema, listarOrdinariosSchema, obtenerOrdinarioSchema,
} from '../validations/ordinarios.validation';

export const ordinariosController = {
  async listar(req: Request, res: Response) {
    const { query } = listarOrdinariosSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },

  async obtener(req: Request, res: Response) {
    const { params } = obtenerOrdinarioSchema.parse({ params: req.params });
    res.json(await service.obtener(params.ordinario));
  },

  async crear(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError('Sesión inválida.', 401);
    const { body } = crearOrdinarioSchema.parse({ body: req.body });
    const ordinario = await service.crear(body, req.user.sub);
    registrarAuditoriaOpcional({
      req, usuarioId: req.user.sub, modulo: 'TRANSFERENCIAS', entidad: 'ORDINARIOS',
      accion: 'ORDINARIO_TRANSFERENCIA_CREADO', registroId: ordinario.ordinario,
      detalle: `Ordinario ${ordinario.ordinario} creado. Fecha del documento ${ordinario.fecha_documento}, fecha de pago ${ordinario.fecha_pago}.`,
    });
    res.status(201).json(ordinario);
  },
};
