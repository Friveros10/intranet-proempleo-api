import { sequelize } from '../database/sequelize';
import type { Transaction } from 'sequelize';
import { AppError } from '../utils/AppError';
import { calcularDv, parseRut } from '../utils/rut';
import { intermediariosRepository as repository } from '../repositories/intermediarios.repository';
import { regionRepository } from '../repositories/sicap/region.repository';
import type { OrigenMarco } from '../validations/marco.validation';
import type {
  GuardarIntermediarioInput,
  GuardarResponsableInput,
  ListarIntermediariosQuery,
} from '../validations/intermediarios.validation';

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

export const intermediariosService = {
  listar(query: ListarIntermediariosQuery) {
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
    const intermediario = await repository.obtener(rut, origen, transaction);
    if (!intermediario) throw new AppError('Intermediario no encontrado', 404);
    return intermediario;
  },

  responsablesPorComuna(comuna: number) {
    return repository.responsablesPorComuna(comuna);
  },

  async crear(data: GuardarIntermediarioInput, usuario: string) {
    const rut = rutValidado(data.rut);
    await validarComuna(data.reg_int, data.ciu_int, data.com_int);
    if (data.rut_res !== null && !await repository.existeResponsable(data.rut_res)) {
      throw new AppError('El responsable seleccionado no existe', 400);
    }
    return sequelize.transaction(async (transaction) => {
      if (await repository.existe(rut.cuerpo, transaction)) {
        throw new AppError('Ya existe un intermediario con ese RUT', 409);
      }
      await repository.crear(rut, data, usuario, transaction);
      return this.obtener(rut.cuerpo, 'proempleo', transaction);
    });
  },

  async actualizar(rutParam: number, data: GuardarIntermediarioInput, usuario: string) {
    const rut = rutValidado(data.rut);
    if (rut.cuerpo !== rutParam) throw new AppError('El RUT no se puede modificar', 400);
    await validarComuna(data.reg_int, data.ciu_int, data.com_int);
    if (data.rut_res !== null && !await repository.existeResponsable(data.rut_res)) {
      throw new AppError('El responsable seleccionado no existe', 400);
    }
    return sequelize.transaction(async (transaction) => {
      const actual = await repository.obtener(rutParam, 'proempleo', transaction);
      if (!actual) throw new AppError('Intermediario no encontrado para modificar', 404);
      const inmutable =
        data.nom_int !== actual.nom_int ||
        data.reg_int !== actual.reg_int ||
        data.ciu_int !== actual.ciu_int ||
        data.com_int !== actual.com_int ||
        data.int_int !== (actual.int_int === 'S');
      if (inmutable) {
        throw new AppError('Solo se pueden modificar dirección, teléfono, email y responsable', 400);
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
