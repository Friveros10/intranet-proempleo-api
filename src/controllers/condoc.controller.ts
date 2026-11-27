import { Request, Response } from 'express';
import { condocService as service } from '../services/condoc.service';
import {
  cambiarEstadoCondocSchema,
  guardarCondocSchema,
  listarCondocSchema,
  obtenerCondocSchema,
  programasCondocSchema,
} from '../validations/condoc.validation';
import { AppError } from '../utils/AppError';
import { diferenciasAuditables, valorAuditable } from '../utils/auditoriaCambios';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';

const auditoria = { modulo: 'GESTION_DE_ARCHIVOS', entidad: 'CONDOC' };

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const condocController = {
  async listar(req: Request, res: Response) {
    const { query } = listarCondocSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },
  async anios(_req: Request, res: Response) {
    res.json(await service.anios());
  },
  async areas(_req: Request, res: Response) {
    res.json(await service.areas());
  },
  async programasAnios(_req: Request, res: Response) {
    res.json(await service.programasAnios());
  },
  async programas(req: Request, res: Response) {
    const { query } = programasCondocSchema.parse({ query: req.query });
    res.json(await service.programas(query.anio));
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerCondocSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.id, query.origen));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarCondocSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const documento = await service.crear(body, usuarioId);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId,
      accion: 'CONDOC_CREADO', registroId: String(documento.id_condoc),
      detalle: `Documento ${documento.fol_condoc}. Año ${documento.cod_ano}, programa ${documento.nombre_mar || documento.corr_mar}, área ${documento.nom_are || documento.cod_are}, tipo ${valorAuditable(documento.tip_condoc)}, estado ${valorAuditable(documento.est_condoc)}.`,
    });
    res.status(201).json(documento);
  },
  async avanzarEstado(req: Request, res: Response) {
    const { params } = cambiarEstadoCondocSchema.parse({ params: req.params });
    const usuarioId = usuario(req);
    const { anterior, actualizado } = await service.avanzarEstado(params.id, usuarioId);
    const cambios = diferenciasAuditables(anterior, actualizado, [['est_condoc', 'Estado']]);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId,
      accion: 'CONDOC_ESTADO_ACTUALIZADO', registroId: String(actualizado.id_condoc),
      detalle: `Documento ${actualizado.fol_condoc}. ${cambios.join(' · ')}.`,
    });
    res.json(actualizado);
  },
};
