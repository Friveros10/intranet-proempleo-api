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
    res.status(201).json(await service.crearResponsable(body, usuario(req)));
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerEjecutorSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.rut, query.origen));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarEjecutorSchema.parse({ body: req.body });
    res.status(201).json(await service.crear(body, usuario(req)));
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarEjecutorSchema.parse({ body: req.body });
    res.json(await service.actualizar(Number(req.params.rut), body, usuario(req)));
  },
};
