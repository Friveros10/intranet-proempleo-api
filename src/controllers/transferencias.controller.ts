import type { Request, Response } from 'express';
import { transferenciasService as service } from '../services/transferencias.service';
import { AppError } from '../utils/AppError';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';
import { diferenciasAuditables, valorAuditable } from '../utils/auditoriaCambios';
import {
  buscarDecretoTransferenciaSchema, listarTransferenciasSchema,
  editarTransferenciaSchema,
  proyectosTransferenciaSchema, registrarTransferenciaSchema,
} from '../validations/transferencias.validation';

export const transferenciasController = {
  async buscarDecreto(req: Request, res: Response) {
    const { params } = buscarDecretoTransferenciaSchema.parse({ params: req.params });
    res.json(await service.buscarDecreto(params.decreto));
  },

  async proyectos(req: Request, res: Response) {
    const { params, query } = proyectosTransferenciaSchema.parse({ params: req.params, query: req.query });
    res.json(await service.proyectos(params.decreto, query));
  },

  async listar(req: Request, res: Response) {
    const { params, query } = listarTransferenciasSchema.parse({ params: req.params, query: req.query });
    res.json(await service.listar(params.ordinario, query));
  },

  async registrar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError('Sesión inválida.', 401);
    const { params, body } = registrarTransferenciaSchema.parse({ params: req.params, body: req.body });
    const { resultado, transferencia, oficio, saldoAnterior, transferidoAnterior } =
      await service.registrar(params.ordinario, body, req.user.sub);
    registrarAuditoriaOpcional({
      req, usuarioId: req.user.sub, modulo: 'TRANSFERENCIAS', entidad: 'TRANSFERENCIAS',
      accion: 'TRANSFERENCIA_REGISTRADA', registroId: String(transferencia.id),
      detalle: `Ordinario ${oficio.ordinario}, decreto ${body.decreto}, proyecto ${body.folio}, transferencia N° ${transferencia.correlativo}.` +
        ` Monto ${body.monto} CLP, fecha de pago ${valorAuditable(oficio.fecha_pago)}.` +
        ` Total transferido de ${transferidoAnterior} a ${resultado.transferido} CLP. Saldo de ${saldoAnterior} a ${resultado.saldo} CLP.` +
        (body.observaciones ? ` Observaciones ${valorAuditable(body.observaciones)}.` : ''),
    });
    res.status(201).json(resultado);
  },
  async actualizar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError('Sesión inválida.', 401);
    const { params, body } = editarTransferenciaSchema.parse(req);
    const { anterior, resultado } = await service.actualizar(params.ordinario, params.id, body, req.user.sub);
    const cambios = diferenciasAuditables(anterior, resultado, [['monto', 'Monto'], ['observaciones', 'Observaciones']]);
    registrarAuditoriaOpcional({
      req, usuarioId: req.user.sub, modulo: 'TRANSFERENCIAS', entidad: 'TRANSFERENCIAS',
      accion: 'TRANSFERENCIA_ACTUALIZADA', registroId: String(params.id),
      detalle: `Ordinario ${params.ordinario}, decreto ${resultado.decreto}, proyecto ${resultado.folio}, transferencia N° ${resultado.correlativo}. ${cambios.join(' · ') || 'Guardado sin cambios'}.`,
    });
    res.json(resultado);
  },
};
