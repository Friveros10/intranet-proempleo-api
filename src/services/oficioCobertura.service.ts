import { sequelize } from '../database/sequelize';
import { AppError } from '../utils/AppError';
import { oficioCoberturaRepository as repository } from '../repositories/oficioCobertura.repository';
import { TIPO_COBERTURA } from '../validations/oficioCobertura.validation';
import type { CrearOrdinarioInput, GuardarCoberturasInput, ListarOrdinariosQuery } from '../validations/oficioCobertura.validation';

function clave(codCom: number, jornada: string | null, tipo: string | null, mes: number, anio: number): string {
  return [
    codCom,
    (jornada ?? '').trim().toUpperCase(),
    (tipo ?? '').trim().toUpperCase(),
    mes,
    anio,
  ].join('|');
}

export const oficioCoberturaService = {
  listar(query: ListarOrdinariosQuery) {
    return repository.listar(query);
  },

  regiones() {
    return repository.regiones();
  },

  ciudades(region: number) {
    return repository.ciudades(region);
  },

  comunas(ciudad: number) {
    return repository.comunas(ciudad);
  },

  programas(anio: number) {
    return repository.programas(anio);
  },

  programasAnios() {
    return repository.programasAnios();
  },

  async buscarOrdinario(folio: string) {
    const ordinario = await repository.buscarOrdinario(folio);
    if (!ordinario) throw new AppError('No existe un ordinario con ese folio', 404);
    return { ...ordinario, coberturas: await repository.coberturas(ordinario.ord_ofi) };
  },

  async crearOrdinario(data: CrearOrdinarioInput, usuario: string) {
    const { ord_ofi: folio, cod_region: codRegion } = data;
    if (!await repository.regionActiva(codRegion)) {
      throw new AppError('La región seleccionada no existe o no está activa', 400);
    }
    return sequelize.transaction(async (transaction) => {
      if (await repository.buscarOrdinario(folio, transaction)) {
        throw new AppError('Ya existe un ordinario con ese folio', 409);
      }
      await repository.crearOrdinario(data, usuario, transaction);
      const ordinario = await repository.buscarOrdinario(folio, transaction);
      if (!ordinario) throw new AppError('No se pudo leer el ordinario creado', 500);
      return { ...ordinario, coberturas: [] };
    });
  },

  async guardarCoberturas(data: GuardarCoberturasInput) {
    const datosGuardados = await sequelize.transaction(async (transaction) => {
      const ordinario = await repository.buscarOrdinario(data.ord_ofi, transaction);
      if (!ordinario) throw new AppError('No existe un ordinario con ese folio', 404);
      if (ordinario.origen !== 'proempleo') {
        throw new AppError('Solo se pueden agregar coberturas a ordinarios de ProEmpleo', 400);
      }
      const existentes = await repository.coberturasExistentes(data.ord_ofi, transaction);
      const periodoGuardado = ordinario.ano_ofi && ordinario.mes_desde && ordinario.mes_hasta
        ? { ano_ofi: ordinario.ano_ofi, mes_desde: ordinario.mes_desde, mes_hasta: ordinario.mes_hasta }
        : null;
      if (data.periodo && (periodoGuardado || existentes.length)) {
        throw new AppError('Ya hay un período o coberturas registrados para el ordinario', 409);
      }
      const periodo = periodoGuardado ?? data.periodo;
      if (!periodo) throw new AppError('El ordinario debe tener un período definido', 400);
      const { ano_ofi, mes_desde, mes_hasta } = periodo;
      if (!await repository.marcoDisponible(data.corr_mar, ano_ofi, transaction)) {
        throw new AppError('El programa no está activo o no pertenece al año del ordinario', 400);
      }
      for (const cobertura of data.coberturas) {
        if (cobertura.cod_reg !== ordinario.cod_region) {
          throw new AppError('Las coberturas deben pertenecer a la región del ordinario', 400);
        }
        if (!await repository.comunaValida(cobertura.cod_reg, cobertura.cod_ciu, cobertura.cod_com, transaction)) {
          throw new AppError('La comuna no pertenece a la provincia y región seleccionadas', 400);
        }
      }
      const vistas = new Set<string>();
      const conflictos: number[] = [];
      const meses = Array.from({ length: mes_hasta - mes_desde + 1 }, (_, i) => mes_desde + i);
      const ocupadas = new Set(existentes.filter((item) => item.ano_ofi === ano_ofi)
        .map((item) => clave(item.cod_com, item.jor_ofi, item.tip_ofi, item.Mes_ofi ?? 0, ano_ofi)));
      data.coberturas.forEach((cobertura, indice) => {
        const claves = meses.map((mes) => clave(cobertura.cod_com, cobertura.jor_ofi, TIPO_COBERTURA, mes, ano_ofi));
        const repetida = claves.some((key) => ocupadas.has(key) || vistas.has(key));
        claves.forEach((key) => vistas.add(key));
        if (repetida) conflictos.push(indice);
      });
      if (conflictos.length) {
        throw new AppError(
          'Hay coberturas con la misma comuna, jornada y tipo dentro del período',
          409,
          { conflictos },
        );
      }
      if (!periodoGuardado) await repository.fijarPeriodo(data.ord_ofi, periodo, transaction);
      await repository.guardarCoberturas(data.ord_ofi, data, periodo, transaction);
      return { periodo, periodoAgregado: !periodoGuardado, folio: ordinario.ord_ofi, region: ordinario.cod_region };
    });
    return { coberturas: await repository.coberturas(data.ord_ofi), datosGuardados };
  },
};
