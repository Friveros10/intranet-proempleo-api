import { sequelize } from '../database/sequelize';
import type { Transaction } from 'sequelize';
import { AppError } from '../utils/AppError';
import { calcularDv, parseRut } from '../utils/rut';
import { ejecutoresRepository as repository } from '../repositories/ejecutores.repository';
import { regionRepository } from '../repositories/sicap/region.repository';
import type { OrigenMarco } from '../validations/marco.validation';
import type { GuardarResponsableInput } from '../validations/intermediarios.validation';
import type {
  GuardarEjecutorInput,
  ListarEjecutoresQuery,
} from '../validations/ejecutores.validation';

function rutValidado(rutFormateado: string) {
  const rut = parseRut(rutFormateado);
  if (calcularDv(rut.cuerpo) !== rut.dv) {
    throw new AppError('El dígito verificador del RUT no es válido', 400);
  }
  return rut;
}

async function validarComuna(region: number, ciudad: number, comuna: number) {
  if (!await repository.comunaValida(region, ciudad, comuna)) {
    throw new AppError('La comuna no pertenece a la provincia y región seleccionadas', 400);
  }
}

export const ejecutoresService = {
  listar(query: ListarEjecutoresQuery) {
    return repository.listar(query);
  },

  regiones() {
    return regionRepository.findRegionesActivas();
  },

  ciudades(region: number) {
    return repository.ciudades(region);
  },

  comunas(filtros: { region?: number; ciudad?: number }) {
    return repository.comunas(filtros);
  },

  async obtener(rut: number, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const ejecutor = await repository.obtener(rut, origen, transaction);
    if (!ejecutor) throw new AppError('Ejecutor no encontrado', 404);
    return ejecutor;
  },

  responsablesPorComuna(comuna: number) {
    return repository.responsablesPorComuna(comuna);
  },

  async crear(data: GuardarEjecutorInput, usuario: string) {
    const rut = rutValidado(data.rut);
    await validarComuna(data.reg_eje, data.ciu_eje, data.com_eje);
    if (data.rut_res !== null && !await repository.existeResponsable(data.rut_res)) {
      throw new AppError('El responsable seleccionado no existe', 400);
    }
    return sequelize.transaction(async (transaction) => {
      if (await repository.existe(rut.cuerpo, transaction)) {
        throw new AppError('Ya existe un ejecutor con ese RUT', 409);
      }
      await repository.crear(rut, data, usuario, transaction);
      return this.obtener(rut.cuerpo, 'proempleo', transaction);
    });
  },

  async actualizar(rutParam: number, data: GuardarEjecutorInput, usuario: string) {
    const rut = rutValidado(data.rut);
    if (rut.cuerpo !== rutParam) throw new AppError('El RUT no se puede modificar', 400);
    await validarComuna(data.reg_eje, data.ciu_eje, data.com_eje);
    if (data.rut_res !== null && !await repository.existeResponsable(data.rut_res)) {
      throw new AppError('El responsable seleccionado no existe', 400);
    }
    return sequelize.transaction(async (transaction) => {
      const actual = await repository.obtener(rutParam, 'proempleo', transaction);
      if (!actual) throw new AppError('Ejecutor no encontrado para modificar', 404);
      const inmutable =
        data.nom_eje !== actual.nom_eje ||
        data.reg_eje !== actual.reg_eje ||
        data.ciu_eje !== actual.ciu_eje ||
        data.com_eje !== actual.com_eje;
      if (inmutable) {
        throw new AppError('Solo se pueden modificar dirección, teléfono y responsable', 400);
      }
      await repository.actualizar(rutParam, data, usuario, transaction);
      return this.obtener(rutParam, 'proempleo', transaction);
    });
  },

  async crearResponsable(data: GuardarResponsableInput, usuario: string) {
    const rut = rutValidado(data.rut);
    await validarComuna(data.reg_res, data.ciu_res, data.com_res);
    return sequelize.transaction(async (transaction) => {
      if (await repository.existeResponsable(rut.cuerpo, transaction)) {
        throw new AppError('Ya existe un responsable con ese RUT', 409);
      }
      await repository.crearResponsable(rut, data, usuario, transaction);
      return { rut_res: rut.cuerpo, dig_res: rut.dv };
    });
  },
};
