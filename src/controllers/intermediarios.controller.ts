import { Request, Response } from 'express';
import { intermediariosService as service } from '../services/intermediarios.service';
import {
  guardarIntermediarioSchema,
  listarIntermediariosSchema,
  obtenerIntermediarioSchema,
} from '../validations/intermediarios.validation';
import {
  ciudadesSchema,
  comunasSchema,
  guardarResponsableSchema,
  responsablesPorComunaSchema,
} from '../validations/intermediarios.validation';
import { AppError } from '../utils/AppError';
import { diferenciasAuditables, valorAuditable } from '../utils/auditoriaCambios';
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';

const modulo = 'INTERMEDIARIOS';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const intermediariosController = {
  async listar(req: Request, res: Response) {
    const { query } = listarIntermediariosSchema.parse({ query: req.query });
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
      accion: 'INTERMEDIARIO_RESPONSABLE_CREADO', registroId: String(responsable.rut_res),
      region: body.reg_res,
      detalle: `Responsable ${responsable.rut_res}-${responsable.dig_res} creado en la comuna ${body.com_res}.`,
    });
    res.status(201).json(responsable);
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerIntermediarioSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.rut, query.origen));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarIntermediarioSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const intermediario = await service.crear(body, usuarioId);
    registrarAuditoriaOpcional({
      req, usuarioId, modulo, entidad: 'INTERMEDIARIOS',
      accion: 'INTERMEDIARIO_CREADO', registroId: String(intermediario.rut_int), region: intermediario.reg_int,
      detalle: `Intermediario ${valorAuditable(intermediario.nom_int)} creado en la comuna ${intermediario.com_int}.`,
    });
    res.status(201).json(intermediario);
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarIntermediarioSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const { anterior, actualizado } = await service.actualizar(Number(req.params.rut), body, usuarioId);
    const cambios = diferenciasAuditables(anterior, actualizado, [
      ['dir_int', 'Dirección'], ['tel_int', 'Teléfono'], ['ema_int', 'Email de contacto'], ['rut_res', 'RUT del responsable'],
    ]);
    registrarAuditoriaOpcional({
      req, usuarioId, modulo, entidad: 'INTERMEDIARIOS',
      accion: 'INTERMEDIARIO_ACTUALIZADO', registroId: String(actualizado.rut_int), region: actualizado.reg_int,
      detalle: cambios.join(' · ') || 'Guardado sin cambios.',
    });
    res.json(actualizado);
  },
};
