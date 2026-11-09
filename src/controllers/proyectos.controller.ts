import { Request, Response } from 'express';
import { proyectosService as service } from '../services/proyectos.service';
import {
  catalogoPorComunaSchema,
  eliminarProyectoSchema,
  guardarProyectoSchema,
  listarProyectosSchema,
  obtenerProyectoSchema,
  listarBeneficiariosProyectoSchema,
  agregarBeneficiarioProyectoSchema,
  eliminarBeneficiarioProyectoSchema,
  buscarBeneficiarioProyectoSchema,
} from '../validations/proyectos.validation';
import {
  ciudadesSchema,
  comunasSchema,
  guardarResponsableSchema,
} from '../validations/intermediarios.validation';
import { AppError } from '../utils/AppError';
import { asignarDecretoProyectoSchema } from '../validations/proyectos.validation';

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub)) throw new AppError('Sesión inválida', 401);
  return req.user.sub;
}

export const proyectosController = {
  async decretosDisponibles(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.decretosDisponibles(params.folio, query.origen));
  },
  async asignarDecreto(req: Request, res: Response) {
    const { params, body } = asignarDecretoProyectoSchema.parse({ params: req.params, body: req.body });
    res.status(201).json(await service.asignarDecreto(params.folio, body, usuario(req)));
  },
  async opcionesFiltros(req: Request, res: Response) {
    const { query } = listarProyectosSchema.parse({ query: req.query });
    res.json(await service.opcionesFiltros(query.anio, res.locals.regionProyectos));
  },
  async listar(req: Request, res: Response) {
    const { query } = listarProyectosSchema.parse({ query: req.query });
    res.json(await service.listar({ ...query, region: res.locals.regionProyectos ?? query.region }));
  },
  banco(_req: Request, res: Response) {
    res.json(service.banco());
  },
  detalleGastos(_req: Request, res: Response) {
    res.json(service.detalleGastos());
  },
  async anios(_req: Request, res: Response) {
    res.json(await service.anios());
  },
  async regiones(_req: Request, res: Response) {
    const regiones = await service.regiones();
    res.json(res.locals.regionProyectos ? regiones.filter((r) => Number(r.cod_region) === res.locals.regionProyectos) : regiones);
  },
  async ciudades(req: Request, res: Response) {
    const { query } = ciudadesSchema.parse({ query: req.query });
    res.json(await service.ciudades(query.region));
  },
  async comunas(req: Request, res: Response) {
    const { query } = comunasSchema.parse({ query: req.query });
    res.json(await service.comunas({ ...query, region: res.locals.regionProyectos ?? query.region }));
  },
  async intermediarios(req: Request, res: Response) {
    const { query } = catalogoPorComunaSchema.parse({ query: req.query });
    res.json(await service.intermediarios(query.comuna, res.locals.regionProyectos ?? query.region));
  },
  async ejecutores(req: Request, res: Response) {
    const { query } = catalogoPorComunaSchema.parse({ query: req.query });
    res.json(await service.ejecutores(query.comuna, res.locals.regionProyectos ?? query.region));
  },
  async responsables(req: Request, res: Response) {
    const { query } = catalogoPorComunaSchema.parse({ query: req.query });
    res.json(await service.responsables(query.comuna, res.locals.regionProyectos ?? query.region));
  },
  async crearResponsable(req: Request, res: Response) {
    const { body } = guardarResponsableSchema.parse({ body: req.body });
    res.status(201).json(await service.crearResponsable(body, usuario(req)));
  },
  async proximoFolio(_req: Request, res: Response) {
    res.json({ folio: await service.proximoFolio() });
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.obtener(params.folio, query.origen));
  },
  async gastos(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.gastos(params.folio, query.origen));
  },
  async resumen(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.resumen(params.folio, query.origen));
  },
  async beneficiarios(req: Request, res: Response) {
    const { params, query } = listarBeneficiariosProyectoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.beneficiarios(params.folio, query));
  },
  async agregarBeneficiario(req: Request, res: Response) {
    const { params, body } = agregarBeneficiarioProyectoSchema.parse({ params: req.params, body: req.body });
    res.status(201).json(await service.agregarBeneficiario(params.folio, body, usuario(req)));
  },
  async buscarBeneficiario(req: Request, res: Response) {
    const { params, query } = buscarBeneficiarioProyectoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.buscarBeneficiario(params.folio, query));
  },
  async eliminarBeneficiario(req: Request, res: Response) {
    const { params, query } = eliminarBeneficiarioProyectoSchema.parse({ params: req.params, query: req.query });
    res.json(await service.eliminarBeneficiario(params.folio, params.rut, query, usuario(req)));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarProyectoSchema.parse({ body: req.body });
    res.status(201).json(await service.crear(body, usuario(req)));
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarProyectoSchema.parse({ body: req.body });
    res.json(await service.actualizar(Number(req.params.folio), body, usuario(req)));
  },
  async eliminar(req: Request, res: Response) {
    const { params } = eliminarProyectoSchema.parse({ params: req.params });
    res.json(await service.eliminar(params.folio, usuario(req)));
  },
};
