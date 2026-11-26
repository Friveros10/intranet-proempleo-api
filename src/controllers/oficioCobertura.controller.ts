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
import { registrarAuditoriaOpcional } from '../utils/auditoriaOpcional';

const modulo = 'OFICIO_COBERTURA';
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
    const usuarioId = usuario(req);
    const ordinario = await service.crearOrdinario(body, usuarioId);
    registrarAuditoriaOpcional({
      req, usuarioId, modulo, accion: 'OFICIO_COBERTURA_ORDINARIO_CREADO', entidad: 'ORDOFICOB',
      registroId: ordinario.ord_ofi, region: body.cod_region,
      detalle: `Oficio ${ordinario.ord_ofi} creado en ${ordinario.nom_region || `región ${body.cod_region}`}, período ${body.mes_desde}–${body.mes_hasta} de ${body.ano_ofi}.`,
    });
    res.status(201).json(ordinario);
  },
  async coberturas(req: Request, res: Response) {
    const { params } = folioOficioSchema.parse({ params: req.params });
    res.json((await service.buscarOrdinario(params.folio)).coberturas);
  },
  async guardarCoberturas(req: Request, res: Response) {
    const { body } = guardarCoberturasSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const { coberturas, datosGuardados } = await service.guardarCoberturas(body);
    const { periodo, periodoAgregado, folio, region } = datosGuardados;
    const comunas = new Map(coberturas.map((cobertura) => [cobertura.cod_com, cobertura.nom_com]));
    const agregadas = body.coberturas.map(({ cod_com, cod_ciu, jor_ofi, ben_ofi }) =>
      `Comuna ${comunas.get(cod_com) || cod_com} (provincia ${cod_ciu}), jornada ${jor_ofi}, ${ben_ofi} cupos mensuales`,
    );
    const periodoTexto = `${periodo.mes_desde}–${periodo.mes_hasta} de ${periodo.ano_ofi}`;
    registrarAuditoriaOpcional({
      req, usuarioId, modulo, accion: 'OFICIO_COBERTURA_COBERTURAS_AGREGADAS', entidad: 'OFICIOCOB',
      registroId: folio, region,
      detalle: `Oficio ${folio}, programa ${body.corr_mar}, período ${periodoTexto}.` +
        (periodoAgregado ? ' Se definió el período del oficio.' : '') +
        ` Coberturas agregadas · ${agregadas.join(' · ')}.`,
    });
    res.status(201).json({ coberturas });
  },
};
