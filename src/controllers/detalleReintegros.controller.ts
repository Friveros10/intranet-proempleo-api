import type { Request, Response } from 'express';
import { detalleReintegrosService as service } from '../services/detalleReintegros.service';
import { AppError } from '../utils/AppError';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';
import { diferenciasAuditables, valorAuditable } from '../utils/auditoriaCambios';
import { crearReintegroSchema, editarReintegroSchema, listarReintegrosSchema, proyectoReintegroSchema, reintegroProempleoSchema } from '../validations/detalleReintegros.validation';

const auditoria = { modulo: 'DETALLE_REINTEGROS', entidad: 'DETREINTEGRO' };

function ubicacion({ folio, decreto, mes, anio }: { folio: number; decreto: string; mes: number; anio: number }) {
  return `Proyecto ${folio}, decreto ${decreto}, período ${mes}/${anio}`;
}

function usuario(req: Request) {
  if (!req.user?.sub) throw new AppError('Sesión inválida.', 401);
  return req.user.sub;
}

export const detalleReintegrosController = {
  async listar(req: Request, res: Response) {
    const { query } = listarReintegrosSchema.parse(req);
    res.json(await service.listar(query));
  },
  async buscarProyecto(req: Request, res: Response) {
    const { query } = proyectoReintegroSchema.parse(req);
    res.json(await service.buscarProyecto(query.decreto, query.folio));
  },
  async crear(req: Request, res: Response) {
    const { body } = crearReintegroSchema.parse(req);
    const usuarioId = usuario(req);
    const { resultado, region } = await service.crear(body, usuarioId);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId, region, accion: 'REINTEGRO_CREADO', registroId: String(resultado.correlativo),
      detalle: `${ubicacion(body)}. Monto ${body.monto} CLP, comprobante de egreso ${valorAuditable(body.ordinario)}.`,
    });
    res.status(201).json(resultado);
  },
  async editar(req: Request, res: Response) {
    const { params, body } = editarReintegroSchema.parse(req);
    const usuarioId = usuario(req);
    const reintegro = await service.cambiar(params.id, body, usuarioId);
    const cambios = diferenciasAuditables(
      { monto: reintegro.montoAnterior, ordinario: reintegro.ordinarioAnterior },
      { monto: reintegro.monto, ordinario: reintegro.ordinario },
      [['monto', 'Monto'], ['ordinario', 'Comprobante de egreso']],
    );
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId, region: reintegro.region, accion: 'REINTEGRO_ACTUALIZADO',
      registroId: String(reintegro.correlativo),
      detalle: `${ubicacion(reintegro)}. ${cambios.length ? cambios.join(' · ') : 'Guardado sin cambios'}.`,
    });
    res.json({ correlativo: reintegro.correlativo });
  },
  async eliminar(req: Request, res: Response) {
    const { params } = reintegroProempleoSchema.parse(req);
    const usuarioId = usuario(req);
    const reintegro = await service.cambiar(params.id, null, usuarioId);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId, region: reintegro.region, accion: 'REINTEGRO_ELIMINADO',
      registroId: String(reintegro.correlativo),
      detalle: `${ubicacion(reintegro)}. Estado de ${valorAuditable(reintegro.estadoAnterior)} a ${valorAuditable(reintegro.estado)}. Monto eliminado ${reintegro.montoAnterior} CLP.`,
    });
    res.json({ correlativo: reintegro.correlativo });
  },
};
