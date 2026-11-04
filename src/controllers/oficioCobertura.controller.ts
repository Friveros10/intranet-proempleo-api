import { Request, Response } from 'express';
import { oficioCoberturaService as service } from '../services/oficioCobertura.service';
import {
  ciudadesOficioSchema,
  comunasOficioSchema,
  crearOrdinarioSchema,
  folioOficioSchema,
  guardarCoberturasSchema,
  listarOrdinariosSchema,
  programasOficioSchema,
} from '../validations/oficioCobertura.validation';
import { AppError } from '../utils/AppError';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const oficioCoberturaController = {
  async listar(req: Request, res: Response) {
    const { query } = listarOrdinariosSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },
  async regiones(_req: Request, res: Response) {
    res.json(await service.regiones());
  },
  async ciudades(req: Request, res: Response) {
    const { query } = ciudadesOficioSchema.parse({ query: req.query });
    res.json(await service.ciudades(query.region));
  },
  async comunas(req: Request, res: Response) {
    const { query } = comunasOficioSchema.parse({ query: req.query });
    res.json(await service.comunas(query.ciudad));
  },
  async programas(req: Request, res: Response) {
    const { query } = programasOficioSchema.parse({ query: req.query });
    res.json(await service.programas(query.anio));
  },
  async programasAnios(_req: Request, res: Response) {
    res.json(await service.programasAnios());
  },
  async buscarOrdinario(req: Request, res: Response) {
    const { params } = folioOficioSchema.parse({ params: req.params });
    res.json(await service.buscarOrdinario(params.folio));
  },
  async crearOrdinario(req: Request, res: Response) {
    const { body } = crearOrdinarioSchema.parse({ body: req.body });
    res.status(201).json(await service.crearOrdinario(body.ord_ofi, body.cod_region, usuario(req)));
  },
  async coberturas(req: Request, res: Response) {
    const { params } = folioOficioSchema.parse({ params: req.params });
    res.json((await service.buscarOrdinario(params.folio)).coberturas);
  },
  async guardarCoberturas(req: Request, res: Response) {
    const { body } = guardarCoberturasSchema.parse({ body: req.body });
    res.status(201).json(await service.guardarCoberturas(body));
  },
};
