import { Request, Response } from "express";
import { proyectosService as service } from "../services/proyectos.service";
import {
  catalogoPorComunaSchema,
  eliminarProyectoSchema,
  guardarProyectoSchema,
  listarProyectosSchema,
  obtenerProyectoSchema,
  listarBeneficiariosProyectoSchema,
  agregarBeneficiarioProyectoSchema,
  actualizarHorarioBeneficiarioSchema,
  previsualizarVinculacionSchema,
  vincularBeneficiariosSchema,
  eliminarBeneficiarioProyectoSchema,
  buscarBeneficiarioProyectoSchema,
} from "../validations/proyectos.validation";
import {
  ciudadesSchema,
  comunasSchema,
  guardarResponsableSchema,
} from "../validations/intermediarios.validation";
import { AppError } from "../utils/AppError";
import { asignarDecretoProyectoSchema } from "../validations/proyectos.validation";
import type { AuditAccion } from "../models/AuditLog.model";
import { diferenciasAuditables } from "../utils/auditoriaCambios";
import { registrarAuditoriaOpcional } from "../utils/auditoriaOpcional";

function auditar(
  req: Request, usuarioId: string, accion: AuditAccion, registro: number,
  region: number | null, detalle: string, entidad = "PROYECTOS",
) {
  registrarAuditoriaOpcional({
    req, usuarioId, accion, modulo: "PROYECTOS", entidad,
    registroId: String(registro), region, detalle,
  });
}

function referenciaBeneficiario(folio: number, rut: number, periodo: { mes: number; anio: number }) {
  return `Proyecto ${folio}, beneficiario ${rut}, período ${periodo.mes}/${periodo.anio}.`;
}

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub))
    throw new AppError("Sesión inválida", 401);
  return req.user.sub;
}

export const proyectosController = {
  async decretosDisponibles(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.json(await service.decretosDisponibles(params.folio, query.origen));
  },
  async asignarDecreto(req: Request, res: Response) {
    const { params, body } = asignarDecretoProyectoSchema.parse({
      params: req.params,
      body: req.body,
    });
    res
      .status(201)
      .json(await service.asignarDecreto(params.folio, body, usuario(req)));
  },
  async opcionesFiltros(req: Request, res: Response) {
    const { query } = listarProyectosSchema.parse({ query: req.query });
    res.json(
      await service.opcionesFiltros(query.anio, res.locals.regionProyectos),
    );
  },
  async listar(req: Request, res: Response) {
    const { query } = listarProyectosSchema.parse({ query: req.query });
    res.json(
      await service.listar({
        ...query,
        region: res.locals.regionProyectos ?? query.region,
      }),
    );
  },
  async banco(req: Request, res: Response) {
    res.json(await service.banco(req.query.incluirEliminados === "true"));
  },
  detalleGastos(_req: Request, res: Response) {
    res.json(service.detalleGastos());
  },
  async anios(_req: Request, res: Response) {
    res.json(await service.anios());
  },
  async regiones(_req: Request, res: Response) {
    const regiones = await service.regiones();
    res.json(
      res.locals.regionProyectos
        ? regiones.filter(
            (r) => Number(r.cod_region) === res.locals.regionProyectos,
          )
        : regiones,
    );
  },
  async ciudades(req: Request, res: Response) {
    const { query } = ciudadesSchema.parse({ query: req.query });
    res.json(await service.ciudades(query.region));
  },
  async comunas(req: Request, res: Response) {
    const { query } = comunasSchema.parse({ query: req.query });
    res.json(
      await service.comunas({
        ...query,
        region: res.locals.regionProyectos ?? query.region,
      }),
    );
  },
  async intermediarios(req: Request, res: Response) {
    const { query } = catalogoPorComunaSchema.parse({ query: req.query });
    res.json(
      await service.intermediarios(
        query.comuna,
        res.locals.regionProyectos ?? query.region,
      ),
    );
  },
  async ejecutores(req: Request, res: Response) {
    const { query } = catalogoPorComunaSchema.parse({ query: req.query });
    res.json(
      await service.ejecutores(
        query.comuna,
        res.locals.regionProyectos ?? query.region,
      ),
    );
  },
  async responsables(req: Request, res: Response) {
    const { query } = catalogoPorComunaSchema.parse({ query: req.query });
    res.json(
      await service.responsables(
        query.comuna,
        res.locals.regionProyectos ?? query.region,
      ),
    );
  },
  async crearResponsable(req: Request, res: Response) {
    const { body } = guardarResponsableSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const responsable = await service.crearResponsable(body, usuarioId);
    auditar(req, usuarioId, "PROYECTO_RESPONSABLE_CREADO", responsable.rut_res, body.reg_res,
      `Responsable ${responsable.rut_res}-${responsable.dig_res} creado en la comuna ${body.com_res}.`, "RESPONSABLES");
    res.status(201).json(responsable);
  },
  async proximoFolio(_req: Request, res: Response) {
    res.json({ folio: await service.proximoFolio() });
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.json(await service.obtener(params.folio, query.origen));
  },
  async gastos(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.json(await service.gastos(params.folio, query.origen));
  },
  async resumen(req: Request, res: Response) {
    const { params, query } = obtenerProyectoSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.json(await service.resumen(params.folio, query.origen));
  },
  async beneficiarios(req: Request, res: Response) {
    const { params, query } = listarBeneficiariosProyectoSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.json(await service.beneficiarios(params.folio, query));
  },
  async agregarBeneficiario(req: Request, res: Response) {
    const { params, body } = agregarBeneficiarioProyectoSchema.parse({
      params: req.params,
      body: req.body,
    });
    const usuarioId = usuario(req);
    const { region, resultado } = await service.agregarBeneficiario(params.folio, body, usuarioId);
    auditar(req, usuarioId, "PROYECTO_BENEFICIARIO_AGREGADO", params.folio, region,
      referenciaBeneficiario(params.folio, resultado.rut_ben, body), "BENPRO_PROEMPLEO");
    res.status(201).json(resultado);
  },
  async buscarBeneficiario(req: Request, res: Response) {
    const { params, query } = buscarBeneficiarioProyectoSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.json(await service.buscarBeneficiario(params.folio, query));
  },
  async eliminarBeneficiario(req: Request, res: Response) {
    const { params, query } = eliminarBeneficiarioProyectoSchema.parse({
      params: req.params,
      query: req.query,
    });
    const usuarioId = usuario(req);
    const { region, resultado } = await service.eliminarBeneficiario(params.folio, params.rut, query, usuarioId);
    auditar(req, usuarioId, "PROYECTO_BENEFICIARIO_ELIMINADO", params.folio, region,
      `${referenciaBeneficiario(params.folio, params.rut, query)} Asignación marcada como ELIMINADO.`, "BENPRO_PROEMPLEO");
    res.json(resultado);
  },
  async actualizarHorarioBeneficiario(req: Request, res: Response) {
    const { params, query, body } =
      actualizarHorarioBeneficiarioSchema.parse(req);
    const usuarioId = usuario(req);
    const { region, cambios, resultado } = await service.actualizarHorarioBeneficiario(
      params.folio, params.rut, query, body, usuarioId,
    );
    const detalle = cambios.flatMap((fila) =>
      diferenciasAuditables(
        { direccion: fila.direccionAnterior, horario: fila.horarioAnterior },
        { direccion: fila.direccion, horario: fila.horario },
        [["direccion", "Dirección de trabajo"], ["horario", "Horario"]],
      ),
    );
    auditar(req, usuarioId, "PROYECTO_BENEFICIARIO_ACTUALIZADO", params.folio, region,
      `${referenciaBeneficiario(params.folio, params.rut, query)} ${detalle.join(" · ") || "Guardado sin cambios."}`, "BENPRO_PROEMPLEO");
    res.json(resultado);
  },
  async previsualizarVinculacion(req: Request, res: Response) {
    const { params, query } = previsualizarVinculacionSchema.parse(req);
    res.json(await service.previsualizarVinculacion(params.folio, query));
  },
  async vincularBeneficiarios(req: Request, res: Response) {
    const { params, body } = vincularBeneficiariosSchema.parse(req);
    const usuarioId = usuario(req);
    const { region, periodoAnterior, resultado } = await service.vincularBeneficiarios(params.folio, body, usuarioId);
    auditar(req, usuarioId, "PROYECTO_BENEFICIARIOS_VINCULADOS", params.folio, region,
      `Proyecto ${params.folio}. ${resultado.total} beneficiarios vinculados desde ${periodoAnterior.mes}/${periodoAnterior.anio} a ${body.mes}/${body.anio}.`, "BENPRO_PROEMPLEO");
    res.status(201).json(resultado);
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarProyectoSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const proyecto = await service.crear(body, usuarioId);
    auditar(req, usuarioId, "PROYECTO_CREADO", proyecto.fol_pro, proyecto.reg_pro,
      `Proyecto ${proyecto.fol_pro} ${JSON.stringify(proyecto.nom_pro)} creado. Año ${proyecto.ano_pro}, comuna ${proyecto.com_pro}, monto ${proyecto.mon_pro} CLP.`);
    res.status(201).json(proyecto);
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarProyectoSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const { anterior, actualizado } = await service.actualizar(Number(req.params.folio), body, usuarioId);
    const cambios = diferenciasAuditables(anterior, actualizado, [
      ["banco_pro", "Proyecto del banco"], ["nom_pro", "Nombre"], ["ano_pro", "Año"],
      ["rutint_pro", "Intermediario"], ["ruteje_pro", "Ejecutor"], ["rutres_pro", "Responsable"],
      ["reg_pro", "Región"], ["ciu_pro", "Provincia"], ["com_pro", "Comuna"],
      ["obj_pro", "Objetivo"], ["imp_pro", "Impacto"], ["mon_pro", "Monto"], ["jor_pro", "Jornada"],
      ["emp_pro", "Cantidad de beneficiarios"], ["fecini_pro", "Fecha de inicio"], ["fecter_pro", "Fecha de término"],
      ["corr_mar", "Marco presupuestario"],
    ]);
    if (body.gastos.length) {
      const previos = new Map(anterior.gastos.map((item) => [item.corr_itemGas, item]));
      const nuevos = new Map(actualizado.gastos.map((item) => [item.corr_itemGas, item]));
      for (const id of new Set([...previos.keys(), ...nuevos.keys()])) {
        const previo = previos.get(id);
        const nuevo = nuevos.get(id);
        cambios.push(...diferenciasAuditables(
          { monto: previo?.mon_proitemgas ?? "0" },
          { monto: nuevo?.mon_proitemgas ?? "0" },
          [["monto", `Presupuesto de ${nuevo?.nombre ?? previo?.nombre ?? `ítem ${id}`}`]],
        ));
      }
    }
    auditar(req, usuarioId, "PROYECTO_ACTUALIZADO", actualizado.fol_pro, actualizado.reg_pro,
      cambios.join(" · ") || "Proyecto guardado sin cambios.");
    res.json(actualizado);
  },
  async eliminar(req: Request, res: Response) {
    const { params } = eliminarProyectoSchema.parse({ params: req.params });
    const usuarioId = usuario(req);
    const { anterior, resultado } = await service.eliminar(params.folio, usuarioId);
    auditar(req, usuarioId, "PROYECTO_ELIMINADO", params.folio, anterior.reg_pro,
      `Proyecto ${params.folio}. Estado de ${anterior.est_pro ?? "sin estado"} a ELIMINADO.`);
    res.json(resultado);
  },
};
