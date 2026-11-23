import { sequelize } from "../database/sequelize";
import { coberturaProyectoService } from "./coberturaProyecto.service";
import { coberturaProyectoRepository } from "../repositories/coberturaProyecto.repository";
import { Transaction } from "sequelize";
import { AppError } from "../utils/AppError";
import { calcularDv, parseRut } from "../utils/rut";
import { bancoProyectosRepository } from "../repositories/bancoProyectos.repository";
import { DetalleDeGastos } from "../constants/DetalleDeGastos";
import { proyectosRepository as repository } from "../repositories/proyectos.repository";
import { postergacionListadoRepository } from "../repositories/postergacionListado.repository";
import { regionRepository } from "../repositories/sicap/region.repository";
import type { OrigenMarco } from "../validations/marco.validation";
import type { GuardarResponsableInput } from "../validations/intermediarios.validation";
import {
  DIAS_HORARIO,
  type GuardarProyectoInput,
  type HorarioSemanal,
  type ListarProyectosQuery,
  type VincularBeneficiariosInput,
} from "../validations/proyectos.validation";

function prepararHorario(horario: HorarioSemanal) {
  const horario_benproJson = [...horario].sort(
    (a, b) => DIAS_HORARIO.indexOf(a.dia) - DIAS_HORARIO.indexOf(b.dia),
  );
  const horario_benpro = horario_benproJson
    .map(({ dia, entrada, salida }) => `${dia} ${entrada} - ${salida}`)
    .join("\n");
  return { horario_benpro, horario_benproJson };
}

type PeriodoBeneficiarios = { anio: number; mes: number };

async function validarPlazoBeneficiarios(
  folio: number,
  periodo: PeriodoBeneficiarios,
  transaction?: Transaction,
) {
  const plazo = await postergacionListadoRepository.plazo(
    folio,
    periodo,
    transaction,
  );
  if (!plazo.abierto)
    throw new AppError(
      `El plazo para modificar beneficiarios venció el ${plazo.fechaLimite}`,
      409,
    );
}

function mesAnterior({ anio, mes }: PeriodoBeneficiarios) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

async function proyectoParaAsignar(
  folio: number,
  { anio, mes }: PeriodoBeneficiarios,
  transaction?: Transaction,
) {
  const proyecto = await repository.obtener(folio, "proempleo", transaction);
  if (!proyecto || proyecto.est_pro === "ELIMINADO")
    throw new AppError(
      "Solo se pueden modificar proyectos ProEmpleo activos",
      404,
    );
  const periodo = `${anio}-${String(mes).padStart(2, "0")}`;
  const inicio =
    proyecto.fecini_pro &&
    new Date(proyecto.fecini_pro).toISOString().slice(0, 7);
  const termino =
    proyecto.fecter_pro &&
    new Date(proyecto.fecter_pro).toISOString().slice(0, 7);
  if (!inicio || !termino || periodo < inicio || periodo > termino) {
    throw new AppError("El período no está dentro del plazo del proyecto", 400);
  }
  await validarPlazoBeneficiarios(folio, { anio, mes }, transaction);
  return proyecto;
}

const DIAS_POR_MES = 30.4375;

// Meses aproximados entre dos fechas YYYY-MM-DD (rango inclusivo), con la misma
// lógica que replica el formulario: días del período dividido por el promedio de
// días por mes, redondeado y nunca menor a 1.
export function mesesAproximados(desde: string, hasta: string): number {
  const [iniAnio, iniMes, iniDia] = desde.split("-").map(Number);
  const [terAnio, terMes, terDia] = hasta.split("-").map(Number);
  const inicio = Date.UTC(iniAnio, iniMes - 1, iniDia);
  const fin = Date.UTC(terAnio, terMes - 1, terDia);
  const dias = Math.round((fin - inicio) / 86400000) + 1;
  return Math.max(1, Math.round(dias / DIAS_POR_MES));
}

async function nombreBanco(
  id: number,
  transaction: Transaction,
): Promise<string> {
  const banco = await bancoProyectosRepository.obtenerActivo(id, transaction);
  if (!banco) throw new AppError("El banco de proyectos no es válido", 400);
  return banco.nombre_proyecto;
}

function nombreDetalleGasto(id: number): string | null {
  return (
    DetalleDeGastos.find(
      (detalle) => detalle.id === id,
    )?.nombre_detalle.trim() ?? null
  );
}

/**
 * La distribución se persiste completa, igual que la grilla legacy: cada ítem
 * del catálogo tiene una fila en proitemgas_proempleo, incluso si su monto es 0.
 * Esto evita proyectos sin detalle cuando el usuario no abre el modal de gastos.
 */
function completarDistribucionGastos(
  gastos: GuardarProyectoInput["gastos"],
): GuardarProyectoInput["gastos"] {
  const montos = new Map(gastos.map((gasto) => [gasto.corr_itemGas, gasto]));
  return DetalleDeGastos.map((detalle) => ({
    corr_itemGas: detalle.id,
    mon_proitemgas: montos.get(detalle.id)?.mon_proitemgas ?? "0",
    compaGas: montos.get(detalle.id)?.compaGas ?? "0",
  }));
}

function rutValidado(rutFormateado: string) {
  const rut = parseRut(rutFormateado);
  if (calcularDv(rut.cuerpo) !== rut.dv) {
    throw new AppError("El dígito verificador del RUT no es válido", 400);
  }
  return rut;
}

// Intermediario, ejecutor y responsable deben pertenecer a la región del proyecto.
async function validarReferencias(data: GuardarProyectoInput) {
  if (
    !(await repository.comunaValida(data.reg_pro, data.ciu_pro, data.com_pro))
  ) {
    throw new AppError(
      "La comuna no pertenece a la provincia y región seleccionadas",
      400,
    );
  }
  const [intermediario, ejecutor, responsable, anios] = await Promise.all([
    repository
      .intermediarios(undefined, data.reg_pro)
      .then((rows) => rows.some((r) => Number(r.rut_int) === data.rutint_pro)),
    repository
      .ejecutores(undefined, data.reg_pro)
      .then((rows) => rows.some((r) => Number(r.rut_eje) === data.ruteje_pro)),
    repository
      .responsables(undefined, data.reg_pro)
      .then((rows) => rows.some((r) => Number(r.rut_res) === data.rutres_pro)),
    repository.aniosProgramas(),
  ]);
  if (!intermediario)
    throw new AppError(
      "El intermediario seleccionado no pertenece a la región del proyecto",
      400,
    );
  if (!ejecutor)
    throw new AppError(
      "El ejecutor seleccionado no pertenece a la región del proyecto",
      400,
    );
  if (!responsable)
    throw new AppError(
      "El responsable seleccionado no pertenece a la región del proyecto",
      400,
    );
  if (!anios.includes(data.ano_pro)) {
    throw new AppError(
      "El año no corresponde a los programas ingresados en el sistema",
      400,
    );
  }
}

export const proyectosService = {
  async decretosDisponibles(folio: number, origen: OrigenMarco) {
    const proyecto = await this.obtener(folio, origen);
    const [disponibles, asociados] = await Promise.all([
      repository.decretosDisponibles(proyecto.reg_pro, proyecto.ano_pro!),
      repository.decretos(folio),
    ]);
    return disponibles.filter(
      (d) =>
        !d.fol_dec.toUpperCase().includes("P") &&
        !asociados.some((a) => a.fol_dec === d.fol_dec),
    );
  },
  async asignarDecreto(
    folio: number,
    data: { decretos: string[] },
    usuario: string,
  ) {
    return sequelize.transaction(async (transaction) => {
      const proyecto = await repository.obtener(
        folio,
        "proempleo",
        transaction,
      );
      if (!proyecto || proyecto.est_pro === "ELIMINADO")
        throw new AppError("Proyecto no encontrado", 404);
      const asociados = await repository.decretos(folio, transaction);
      const pendientes: { folio: string; folprov: string }[] = [];
      for (const folioDecreto of data.decretos) {
        if (folioDecreto.toUpperCase().includes("P"))
          throw new AppError("No se permiten folios con P", 400);
        if (
          pendientes.some((d) => d.folio === folioDecreto) ||
          asociados.some((d) => d.fol_dec === folioDecreto)
        ) {
          throw new AppError(
            "El decreto ya está asociado al proyecto o está repetido",
            409,
          );
        }
        const decreto = await repository.decretoParaAsignar(
          folioDecreto,
          transaction,
        );
        if (!decreto) throw new AppError("Decreto no encontrado", 404);
        if (
          decreto.ano_dec !== proyecto.ano_pro ||
          !(await repository.intermediarioEnRegion(
            Number(decreto.rutint_dec),
            proyecto.reg_pro,
            transaction,
          ))
        ) {
          throw new AppError(
            "El decreto debe corresponder al año y región del proyecto",
            400,
          );
        }
        pendientes.push({
          folio: folioDecreto,
          folprov: decreto.folprov_dec ?? "",
        });
      }
      for (const decreto of pendientes) {
        await repository.asignarDecreto(
          folio,
          decreto.folio,
          "0",
          usuario,
          transaction,
          decreto.folprov,
        );
      }
      return { fol_pro: folio, decretos: data.decretos };
    });
  },
  async opcionesFiltros(anio?: number, region?: number) {
    if (anio !== undefined) {
      const opciones = await repository.opcionesFiltros(anio, region);
      if (region !== undefined)
        opciones.regiones = (await regionRepository.findAll()).filter(
          (r) => r.cod_region === region,
        );
      return opciones;
    }
    const [regiones, intermediarios, ejecutores] = await Promise.all([
      regionRepository
        .findAll()
        .then((rows) =>
          region === undefined
            ? rows
            : rows.filter((r) => r.cod_region === region),
        ),
      repository.intermediarios(undefined, region),
      repository.ejecutores(undefined, region),
    ]);
    return { regiones, intermediarios, ejecutores };
  },

  listar(query: ListarProyectosQuery) {
    return repository.listar(query);
  },

  banco(incluirEliminados = false) {
    return bancoProyectosRepository.listar(incluirEliminados);
  },

  detalleGastos() {
    return DetalleDeGastos;
  },

  anios() {
    return repository.aniosProgramas();
  },

  regiones() {
    return regionRepository.findAll();
  },

  ciudades(region: number) {
    return repository.ciudades(region);
  },

  comunas(filtros: { region?: number; ciudad?: number }) {
    return repository.comunas(filtros);
  },

  intermediarios(comuna?: number, region?: number) {
    return repository.intermediarios(comuna, region);
  },

  ejecutores(comuna?: number, region?: number) {
    return repository.ejecutores(comuna, region);
  },

  responsables(comuna?: number, region?: number) {
    return repository.responsables(comuna, region);
  },

  async crearResponsable(data: GuardarResponsableInput, usuario: string) {
    const rut = rutValidado(data.rut);
    if (
      !(await repository.comunaValida(data.reg_res, data.ciu_res, data.com_res))
    ) {
      throw new AppError(
        "La comuna no pertenece a la provincia y región seleccionadas",
        400,
      );
    }
    return sequelize.transaction(async (transaction) => {
      if (
        await repository.existeResponsable(rut.cuerpo, undefined, transaction)
      ) {
        throw new AppError("Ya existe un responsable con ese RUT", 409);
      }
      await repository.crearResponsable(rut, data, usuario, transaction);
      return { rut_res: rut.cuerpo, dig_res: rut.dv };
    });
  },

  proximoFolio() {
    return repository.proximoFolio();
  },

  async gastos(folio: number, origen: OrigenMarco = "legacy") {
    const proyecto = await repository.obtener(folio, origen);
    if (!proyecto) throw new AppError("Proyecto no encontrado", 404);
    return proyecto.gastos.map((gasto) => ({
      ...gasto,
      nombre:
        origen === "proempleo"
          ? nombreDetalleGasto(gasto.corr_itemGas)
          : gasto.nombre,
    }));
  },

  async obtener(
    folio: number,
    origen: OrigenMarco = "legacy",
    transaction?: Transaction,
  ) {
    const proyecto = await repository.obtener(folio, origen, transaction);
    if (!proyecto) throw new AppError("Proyecto no encontrado", 404);
    if (origen === "proempleo") {
      proyecto.gastos = proyecto.gastos.map((gasto) => ({
        ...gasto,
        nombre: nombreDetalleGasto(gasto.corr_itemGas),
      }));
    }
    return proyecto;
  },

  async resumen(folio: number, origen: OrigenMarco = "legacy") {
    const proyecto = await this.obtener(folio, origen);
    const [periodos, decretos] = await Promise.all([
      repository.periodosBeneficiarios(folio),
      repository.decretos(folio),
    ]);
    return { proyecto, periodos, decretos };
  },

  async beneficiarios(
    folio: number,
    query: {
      origen: OrigenMarco;
      anio?: number;
      mes?: number;
      page: number;
      rut?: string;
    },
  ) {
    await this.obtener(folio, query.origen);
    const periodos = await repository.periodosBeneficiarios(folio);
    const periodo =
      query.anio !== undefined && query.mes !== undefined
        ? { anio: query.anio, mes: query.mes }
        : (periodos[0] ?? null);
    if (!periodo)
      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        periodo: null,
        plazo: null,
      };
    const [listado, plazo] = await Promise.all([
      repository.beneficiarios(
        folio,
        periodo.anio,
        periodo.mes,
        query.page,
        query.rut,
      ),
      postergacionListadoRepository.plazo(folio, periodo),
    ]);
    return { ...listado, periodo, plazo };
  },

  async buscarBeneficiario(
    folio: number,
    data: { rut: string; anio: number; mes: number },
  ) {
    const rut = rutValidado(data.rut);
    await proyectoParaAsignar(folio, data);
    const beneficiario = await repository.buscarBeneficiario(rut.cuerpo);
    if (!beneficiario) throw new AppError("El beneficiario no existe", 404);
    const asignado = await repository.beneficiarioAsignado(
      rut.cuerpo,
      data.anio,
      data.mes,
    );
    return { ...beneficiario, disponible: !asignado };
  },

  async agregarBeneficiario(
    folio: number,
    data: {
      rut: string;
      anio: number;
      mes: number;
      dir_benpro: string;
      horario_benproJson: HorarioSemanal;
    },
    usuario: string,
  ) {
    const rut = rutValidado(data.rut);
    return sequelize.transaction(async (transaction) => {
      const proyecto = await proyectoParaAsignar(folio, data, transaction);
      if (!(await repository.existeBeneficiario(rut.cuerpo, transaction)))
        throw new AppError("El beneficiario no existe", 404);
      if (
        await repository.beneficiarioAsignado(
          rut.cuerpo,
          data.anio,
          data.mes,
          transaction,
        )
      ) {
        throw new AppError(
          "El beneficiario ya está asignado a un proyecto en este período",
          409,
        );
      }
      const horario = prepararHorario(data.horario_benproJson);
      await repository.agregarBeneficiario(
        folio,
        rut.cuerpo,
        { ...data, ...horario, com_ben: proyecto.com_pro },
        usuario,
        transaction,
      );
      return { fol_pro: folio, rut_ben: rut.cuerpo, ...data, ...horario };
    });
  },

  async previsualizarVinculacion(folio: number, periodo: PeriodoBeneficiarios) {
    await proyectoParaAsignar(folio, periodo);
    const anterior = mesAnterior(periodo);
    const { data } = await repository.beneficiarios(
      folio,
      anterior.anio,
      anterior.mes,
      null,
    );
    return { periodo: anterior, beneficiarios: data };
  },

  async vincularBeneficiarios(
    folio: number,
    data: VincularBeneficiariosInput,
    usuario: string,
  ) {
    return sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction) => {
        const proyecto = await proyectoParaAsignar(folio, data, transaction);
        const anterior = mesAnterior(data);
        const { data: originales } = await repository.beneficiarios(
          folio,
          anterior.anio,
          anterior.mes,
          null,
          undefined,
          transaction,
        );
        const porRut = new Map(originales.map((fila) => [fila.rut_ben, fila]));
        let huboCambios = false;
        const filas = data.beneficiarios.map((fila) => {
          const original = porRut.get(fila.rut);
          if (!original)
            throw new AppError(
              `El beneficiario ${fila.rut} ya no está en el mes anterior`,
              409,
            );
          const horario = fila.horario_benproJson
            ? prepararHorario(fila.horario_benproJson)
            : {
                horario_benpro: original.horario_benpro,
                horario_benproJson: original.horario_benproJson,
              };
          const dir_benpro = fila.dir_benpro ?? original.dir_benpro;
          huboCambios ||=
            dir_benpro?.trim() !== original.dir_benpro?.trim() ||
            horario.horario_benpro !== original.horario_benpro;
          return { rut: fila.rut, dir_benpro, ...horario };
        });
        if (!huboCambios && !data.confirmarSinCambios) {
          throw new AppError(
            "Confirma la vinculación sin modificar horario ni dirección de trabajo",
            409,
          );
        }
        for (const fila of filas) {
          if (!(await repository.existeBeneficiario(fila.rut, transaction))) {
            throw new AppError(
              `El beneficiario ${fila.rut} ya no está disponible`,
              409,
            );
          }
          if (
            await repository.beneficiarioAsignado(
              fila.rut,
              data.anio,
              data.mes,
              transaction,
            )
          ) {
            throw new AppError(
              `El beneficiario ${fila.rut} ya está asignado en el mes seleccionado. Quítalo de la lista para continuar.`,
              409,
            );
          }
          await repository.agregarBeneficiario(
            folio,
            fila.rut,
            {
              ...fila,
              anio: data.anio,
              mes: data.mes,
              com_ben: proyecto.com_pro,
            },
            usuario,
            transaction,
          );
        }
        return { total: filas.length };
      },
    );
  },

  async actualizarHorarioBeneficiario(
    folio: number,
    rut: number,
    periodo: { anio: number; mes: number },
    data: { dir_benpro?: string; horario_benproJson?: HorarioSemanal },
    usuario: string,
  ) {
    return sequelize.transaction(async (transaction) => {
      const proyecto = await repository.obtener(
        folio,
        "proempleo",
        transaction,
      );
      if (!proyecto || proyecto.est_pro === "ELIMINADO")
        throw new AppError(
          "Solo se pueden modificar proyectos ProEmpleo activos",
          404,
        );
      await validarPlazoBeneficiarios(folio, periodo, transaction);
      const datos = {
        dir_benpro: data.dir_benpro,
        ...(data.horario_benproJson &&
          prepararHorario(data.horario_benproJson)),
      };
      if (
        !(await repository.actualizarHorarioBeneficiario(
          folio,
          rut,
          periodo,
          datos,
          usuario,
          transaction,
        ))
      ) {
        throw new AppError("La asignación ProEmpleo no fue encontrada", 404);
      }
      return datos;
    });
  },

  async eliminarBeneficiario(
    folio: number,
    rut: number,
    periodo: { anio: number; mes: number },
    usuario: string,
  ) {
    return sequelize.transaction(async (transaction) => {
      const proyecto = await repository.obtener(
        folio,
        "proempleo",
        transaction,
      );
      if (!proyecto || proyecto.est_pro === "ELIMINADO")
        throw new AppError(
          "Solo se pueden modificar proyectos ProEmpleo activos",
          404,
        );
      await validarPlazoBeneficiarios(folio, periodo, transaction);
      const eliminado = await repository.eliminarBeneficiario(
        folio,
        rut,
        periodo.anio,
        periodo.mes,
        usuario,
        transaction,
      );
      if (!eliminado)
        throw new AppError("La asignación ProEmpleo no fue encontrada", 404);
      return { fol_pro: folio, rut_ben: rut, ...periodo };
    });
  },

  async crear(data: GuardarProyectoInput, usuario: string) {
    const gastos = completarDistribucionGastos(data.gastos);
    await validarReferencias(data);
    const meses = mesesAproximados(data.fecini_pro, data.fecter_pro);
    return sequelize.transaction(async (transaction) => {
      if (await repository.existeFolio(data.fol_pro, transaction)) {
        throw new AppError("Ya existe un proyecto con ese folio", 409);
      }
      const nombre = await nombreBanco(data.banco_pro, transaction);
      const coberturas = await coberturaProyectoService.validar(
        data,
        transaction,
      );
      await repository.crear(data, nombre, meses, usuario, transaction);
      await coberturaProyectoRepository.reemplazar(
        data.fol_pro,
        "proempleo",
        coberturas,
        usuario,
        transaction,
      );
      await repository.reemplazarGastos(
        data.fol_pro,
        gastos,
        {
          anio: data.ano_pro,
          mes: Number(data.fecini_pro.slice(5, 7)),
          region: data.reg_pro,
          usuario,
        },
        transaction,
      );
      return this.obtener(data.fol_pro, "proempleo", transaction);
    });
  },

  async actualizar(
    folioParam: number,
    data: GuardarProyectoInput,
    usuario: string,
  ) {
    if (data.fol_pro !== folioParam)
      throw new AppError("El folio no se puede modificar", 400);
    const gastos = completarDistribucionGastos(data.gastos);
    await validarReferencias(data);
    const meses = mesesAproximados(data.fecini_pro, data.fecter_pro);
    return sequelize.transaction(async (transaction) => {
      const actual = await repository.obtener(
        folioParam,
        "proempleo",
        transaction,
      );
      if (!actual || actual.est_pro === "ELIMINADO") {
        throw new AppError("Proyecto no encontrado para modificar", 404);
      }
      const nombre =
        actual.banco_pro === data.banco_pro
          ? actual.nom_pro
          : await nombreBanco(data.banco_pro, transaction);
      const coberturas = await coberturaProyectoService.validar(
        data,
        transaction,
      );
      await repository.actualizar(
        folioParam,
        data,
        nombre,
        meses,
        usuario,
        transaction,
      );
      await coberturaProyectoRepository.reemplazar(
        folioParam,
        "proempleo",
        coberturas,
        usuario,
        transaction,
      );
      await repository.reemplazarGastos(
        folioParam,
        gastos,
        {
          anio: data.ano_pro,
          mes: Number(data.fecini_pro.slice(5, 7)),
          region: data.reg_pro,
          usuario,
        },
        transaction,
      );
      return this.obtener(folioParam, "proempleo", transaction);
    });
  },

  async eliminar(folio: number, usuario: string) {
    return sequelize.transaction(async (transaction) => {
      const actual = await repository.obtener(folio, "proempleo", transaction);
      if (!actual || actual.est_pro === "ELIMINADO") {
        throw new AppError("Proyecto no encontrado para eliminar", 404);
      }
      await repository.eliminar(folio, usuario, transaction);
      return { fol_pro: folio };
    });
  },
};
