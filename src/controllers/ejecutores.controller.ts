import { Request, Response } from 'express';
import { ejecutoresService as service } from '../services/ejecutores.service';
import {
  guardarEjecutorSchema,
  listarEjecutoresSchema,
  obtenerEjecutorSchema,
} from '../validations/ejecutores.validation';
import {
  ciudadesSchema,
  comunasSchema,
  guardarResponsableSchema,
  responsablesPorComunaSchema,
} from '../validations/intermediarios.validation';
import { AppError } from '../utils/AppError';
import { diferenciasAuditables, valorAuditable } from '../utils/auditoriaCambios';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';

const modulo = 'EJECUTORES';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const ejecutoresController = {
  async listar(req: Request, res: Response) {
    const { query } = listarEjecutoresSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },
  async regiones(_req: Request, res: Response) {
    res.json(await service.regiones());
  },
  async ciudades(req: Request, res: Response) {
    const { query } = ciudadesSchema.parse({ query: req.query });
    res.json(await service.ciudades(query.region));
  },
  async comunas(req: Request, res: Response) {
    const { query } = comunasSchema.parse({ query: req.query });
    res.json(await service.comunas(query));
  },
  async responsables(req: Request, res: Response) {
    const { query } = responsablesPorComunaSchema.parse({ query: req.query });
    res.json(await service.responsablesPorComuna(query.comuna));
  },
  async crearResponsable(req: Request, res: Response) {
    const { body } = guardarResponsableSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const responsable = await service.crearResponsable(body, usuarioId);
    registrarAuditoriaOpcional({
      req, usuarioId, modulo, entidad: 'RESPONSABLES',
      accion: 'EJECUTOR_RESPONSABLE_CREADO', registroId: String(responsable.rut_res),
      region: body.reg_res,
      detalle: `Responsable ${responsable.rut_res}-${responsable.dig_res} creado en la comuna ${body.com_res}.`,
    });
    res.status(201).json(responsable);
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerEjecutorSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.rut, query.origen));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarEjecutorSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const ejecutor = await service.crear(body, usuarioId);
    registrarAuditoriaOpcional({
      req, usuarioId, modulo, entidad: 'EJECUTORES',
      accion: 'EJECUTOR_CREADO', registroId: String(ejecutor.rut_eje), region: ejecutor.reg_eje,
      detalle: `Ejecutor ${valorAuditable(ejecutor.nom_eje)} creado en la comuna ${ejecutor.com_eje}.`,
    });
    res.status(201).json(ejecutor);
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarEjecutorSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const { anterior, actualizado } = await service.actualizar(Number(req.params.rut), body, usuarioId);
    const cambios = diferenciasAuditables(anterior, actualizado, [
      ['dir_eje', 'Dirección'], ['tel_eje', 'Teléfono'], ['rut_res', 'RUT del responsable'],
    ]);
    registrarAuditoriaOpcional({
      req, usuarioId, modulo, entidad: 'EJECUTORES',
      accion: 'EJECUTOR_ACTUALIZADO', registroId: String(actualizado.rut_eje), region: actualizado.reg_eje,
      detalle: cambios.join(' · ') || 'Guardado sin cambios.',
    });
    res.json(actualizado);
  },
};
