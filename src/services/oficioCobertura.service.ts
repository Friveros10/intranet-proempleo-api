import { sequelize } from '../database/sequelize';
import { AppError } from '../utils/AppError';
import { oficioCoberturaRepository as repository } from '../repositories/oficioCobertura.repository';
import type { GuardarCoberturasInput, ListarOrdinariosQuery } from '../validations/oficioCobertura.validation';

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

  async crearOrdinario(folio: string, codRegion: number, usuario: string) {
    if (!await repository.regionActiva(codRegion)) {
      throw new AppError('La región seleccionada no existe o no está activa', 400);
    }
    return sequelize.transaction(async (transaction) => {
      if (await repository.buscarOrdinario(folio, transaction)) {
        throw new AppError('Ya existe un ordinario con ese folio', 409);
      }
      await repository.crearOrdinario(folio, codRegion, usuario, transaction);
      const ordinario = await repository.buscarOrdinario(folio, transaction);
      if (!ordinario) throw new AppError('No se pudo leer el ordinario creado', 500);
      return { ...ordinario, coberturas: [] };
    });
  },

  async guardarCoberturas(data: GuardarCoberturasInput) {
    // Cada cobertura lleva su propio período (ano_ofi, mesDesde, mesHasta).
    for (const cobertura of data.coberturas) {
      if (!await repository.marcoDisponible(data.corr_mar, cobertura.ano_ofi)) {
        throw new AppError('El programa no está activo o no pertenece al año seleccionado', 400);
      }
      if (!await repository.comunaValida(cobertura.cod_reg, cobertura.cod_ciu, cobertura.cod_com)) {
        throw new AppError('La comuna no pertenece a la provincia y región seleccionadas', 400);
      }
    }
    await sequelize.transaction(async (transaction) => {
      const ordinario = await repository.buscarOrdinario(data.ord_ofi, transaction);
      if (!ordinario) throw new AppError('No existe un ordinario con ese folio', 404);
      // En los ordinarios nuevos la región queda fija: las coberturas deben ser de esa región.
      if (ordinario.cod_region !== null) {
        for (const cobertura of data.coberturas) {
          if (cobertura.cod_reg !== ordinario.cod_region) {
            throw new AppError('Las coberturas deben pertenecer a la región del ordinario', 400);
          }
        }
      }
      const existentes = await repository.coberturasExistentes(data.ord_ofi, transaction);
      const vistas = new Set<string>();
      const conflictos: number[] = [];
      data.coberturas.forEach((cobertura, indice) => {
        const meses = Array.from({ length: cobertura.mesHasta - cobertura.mesDesde + 1 }, (_, i) => cobertura.mesDesde + i);
        const ocupadas = new Set(
          existentes
            .filter((item) => item.ano_ofi === cobertura.ano_ofi)
            .map((item) => clave(item.cod_com, item.jor_ofi, item.tip_ofi, item.Mes_ofi ?? 0, cobertura.ano_ofi)),
        );
        const repetida = meses.some((mes) => {
          const key = clave(cobertura.cod_com, cobertura.jor_ofi, cobertura.tip_ofi, mes, cobertura.ano_ofi);
          if (ocupadas.has(key) || vistas.has(key)) return true;
          vistas.add(key);
          return false;
        });
        if (repetida) conflictos.push(indice);
      });
      if (conflictos.length) {
        throw new AppError(
          'Hay coberturas con la misma comuna, jornada y tipo dentro del período',
          409,
          { conflictos },
        );
      }
      await repository.guardarCoberturas(data.ord_ofi, data, transaction);
    });
    return { coberturas: await repository.coberturas(data.ord_ofi) };
  },
};
