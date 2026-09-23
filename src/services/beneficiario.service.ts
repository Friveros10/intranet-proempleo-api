import { Request } from "express";
import {
  beneficiarioRepository,
  FichaBeneficiarioRow,
} from "../repositories/sicap/beneficiario.repository";
import { proyectoRepository } from "../repositories/sicap/proyecto.repository";
import { planEgresoHistoricoRepository } from "../repositories/sicap/planEgresoHistorico.repository";
import { usuarioSicapRepository } from "../repositories/sicap/usuarioSicap.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { ProyectoModel } from "../models/Proyecto.model";
import { AppError } from "../utils/AppError";
import { parseRut } from "../utils/rut";
import {
  CrearBeneficiarioInput,
  ListarBeneficiariosQuery,
} from "../validations/beneficiario.validation";

const PERMISO_VER_TODAS_REGIONES = "REM_VERALL";
const PERMISO_BEN_VER_TODOS = "BEN_VERALL";
const PERMISO_BEN_CREAR = "BEN_CREAR";

// Convierte un RUT formateado ("11.111.111-1" o "11111111-1") al cuerpo numérico, descartando el dígito verificador
function limpiarRut(rutFormateado: string): number {
  const soloAlfanumerico = rutFormateado.replace(/[^0-9kK]/g, "");
  const cuerpo = soloAlfanumerico.slice(0, -1);
  const rut = Number(cuerpo);
  if (!cuerpo || Number.isNaN(rut)) {
    throw new AppError("RUT inválido", 400);
  }
  return rut;
}

function mensajePlanEgreso(anio: number | null): string {
  return `El Rut no puede volver a ingresar al programa, ya que salio por plan de egreso el año ${anio ?? "registrado"}`;
}

export const beneficiarioService = {
  async listar(filtros: ListarBeneficiariosQuery, rutUsuario: number) {
    const [usuario, permisos] = await Promise.all([
      usuarioSicapRepository.findByRut(rutUsuario),
      usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
    ]);
    const puedeVerTodos = permisos.includes(PERMISO_BEN_VER_TODOS);
    const comunaUsuario = puedeVerTodos ? null : (usuario?.com_usu ?? -1);
    return beneficiarioRepository.findAllListado(filtros, comunaUsuario);
  },

  async obtenerPorRut(rutFormateado: string, rutUsuario: number) {
    const rut = limpiarRut(rutFormateado);
    const [beneficiario, proyectos, usuario, permisos] = await Promise.all([
      beneficiarioRepository.findListadoByRut(rut),
      beneficiarioRepository.findProyectosByRut(rut),
      usuarioSicapRepository.findByRut(rutUsuario),
      usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
    ]);

    if (!beneficiario) {
      throw new AppError("Beneficiario no encontrado", 404);
    }

    const puedeVerTodos = permisos.includes(PERMISO_BEN_VER_TODOS);
    if (!puedeVerTodos && beneficiario.com_ben !== usuario?.com_usu) {
      throw new AppError("No tiene acceso a este beneficiario", 403);
    }

    return { beneficiario, proyectos };
  },

  async crear(data: CrearBeneficiarioInput, rutUsuario: number, req: Request) {
    const permisos =
      await usuarioSicapRepository.getPermisosDeUsuario(rutUsuario);
    if (!permisos.includes(PERMISO_BEN_CREAR)) {
      throw new AppError("No tiene permisos para crear beneficiarios", 403);
    }

    const { cuerpo: rut_ben, dv: dig_ben } = parseRut(data.rut);
    const existente = await beneficiarioRepository.findByRut(rut_ben);
    if (existente) {
      throw new AppError("El beneficiario ya existe", 409);
    }

    await beneficiarioRepository.createCompleto({ ...data, rut_ben, dig_ben });
    await auditLogRepository.registrar({
      usuarioId: rutUsuario,
      accion: "BENEFICIARIO_CREADO",
      modulo: "BENEFICIARIOS",
      entidad: "BENEFICIARIOS",
      registroId: String(rut_ben),
      region: data.region,
      detalle: `Beneficiario creado: ${data.nombres} ${data.apellidoPaterno}`,
      req,
    });
    return beneficiarioRepository.findListadoByRut(rut_ben);
  },

  async obtenerBenpro(rutFormateado: string, rutUsuario: number) {
    const rut = limpiarRut(rutFormateado);
    const [beneficiario, proyectos, usuario, permisos] = await Promise.all([
      beneficiarioRepository.findListadoByRut(rut),
      beneficiarioRepository.finBenProByRut(rut),
      usuarioSicapRepository.findByRut(rutUsuario),
      usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
    ]);

    if (!beneficiario) {
      throw new AppError("Beneficiario no encontrado", 404);
    }

    const puedeVerTodos = permisos.includes(PERMISO_BEN_VER_TODOS);
    if (!puedeVerTodos && beneficiario.com_ben !== usuario?.com_usu) {
      throw new AppError("No tiene acceso a este beneficiario", 403);
    }

    return { beneficiario, proyectos };
  },

  listarRegiones() {
    return beneficiarioRepository.listarRegiones();
  },

  listarCiudades(region?: number) {
    return beneficiarioRepository.listarCiudades(region);
  },

  listarComunas(ciudad?: number) {
    return beneficiarioRepository.listarComunas(ciudad);
  },

  async buscarFichaPorRut(
    rutFormateado: string,
  ): Promise<FichaBeneficiarioRow> {
    const rut = limpiarRut(rutFormateado);
    const ficha = await beneficiarioRepository.findByRutFromBenPro(rut);
    if (!ficha) {
      throw new AppError("No se encontró un beneficiario con ese RUT", 404);
    }
    return ficha;
  },

  async buscarActivoPorRut(
    rutFormateado: string,
    rutUsuario: number,
  ): Promise<{ beneficiario: FichaBeneficiarioRow; proyecto: ProyectoModel }> {
    const rut = limpiarRut(rutFormateado);
    const [ficha, usuario, permisos, planEgreso] = await Promise.all([
      beneficiarioRepository.findByRutFromBenPro(rut),
      usuarioSicapRepository.findByRut(rutUsuario),
      usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
      planEgresoHistoricoRepository.findByRun(rut),
    ]);
    if (planEgreso) {
      throw new AppError(mensajePlanEgreso(planEgreso.anio), 409);
    }
    if (!ficha) {
      throw new AppError("No se encontró un beneficiario con ese RUT", 404);
    }

    const puedeVerTodasLasRegiones = permisos.includes(
      PERMISO_VER_TODAS_REGIONES,
    );
    if (!puedeVerTodasLasRegiones && ficha.reg_ben !== usuario?.reg_usu) {
      throw new AppError("El beneficiario no pertenece a tu zona", 404);
    }

    if (ficha.tiene_reemplazo > 0) {
      throw new AppError("El beneficiario tiene un reemplazo en curso", 404);
    }

    const proyecto = await proyectoRepository.findByFolio(ficha.folio_vigente);
    if (!proyecto) {
      throw new AppError("El proyecto asociado al beneficiario no existe", 404);
    }

    return { beneficiario: ficha, proyecto };
  },
};
