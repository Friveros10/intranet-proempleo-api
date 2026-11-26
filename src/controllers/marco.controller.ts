import { Request, Response } from 'express';
import { marcoService } from '../services/marco.service';
import { guardarMarcoSchema, listarMarcosSchema, obtenerMarcoSchema } from '../validations/marco.validation';
import { AppError } from '../utils/AppError';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';
import { describirCambiosMarco } from '../utils/auditoriaMarco';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,15}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const marcoController = {
  async listar(req: Request, res: Response) {
    const { query } = listarMarcosSchema.parse({ query: req.query });
    res.json(await marcoService.listar(query));
  },

  async anios(_req: Request, res: Response) {
    res.json(await marcoService.anios());
  },

  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerMarcoSchema.parse({ params: req.params, query: req.query });
    res.json(await marcoService.obtener(params.id, query.origen));
  },

  async crear(req: Request, res: Response) {
    const { body } = guardarMarcoSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const marco = await marcoService.crear(body, usuarioId);
    registrarAuditoriaOpcional({
      req, usuarioId, accion: 'MARCO_CREADO', modulo: 'LEY_DE_PRESUPUESTO',
      entidad: 'MARCO', registroId: String(marco.corr_mar),
      detalle: `Marco ${marco.corr_mar} creado con ${marco.detalles.length} glosas.`,
    });
    res.status(201).json(marco);
  },

  async actualizar(req: Request, res: Response) {
    const { body } = guardarMarcoSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const { marco, anterior, glosasAnteriores } = await marcoService.actualizar(Number(req.params.id), body, usuarioId);
    registrarAuditoriaOpcional({
      req, usuarioId, accion: 'MARCO_ACTUALIZADO', modulo: 'LEY_DE_PRESUPUESTO',
      entidad: 'MARCO', registroId: String(marco.corr_mar),
      detalle: describirCambiosMarco(anterior, glosasAnteriores, marco),
    });
    res.json(marco);
  },
};
