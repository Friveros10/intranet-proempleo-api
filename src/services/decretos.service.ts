import { decretosRepository as repository } from '../repositories/decretos.repository';
import type { ListarDecretosQuery } from '../validations/decretos.validation';
import { AppError } from '../utils/AppError';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';

export const decretosService = {
  async intermediarios(rut: number) {
    const usuario = await usuarioSicapRepository.findByRut(rut);
    if (!usuario) throw new AppError('Usuario no encontrado', 401);
    if (!usuario.reg_usu || !Number.isInteger(usuario.reg_usu) || usuario.reg_usu < 1) {
      throw new AppError('Tu perfil no tiene una región válida asignada para consultar intermediarios', 403);
    }
    return repository.intermediarios(usuario.reg_usu);
  },
  listar(query: ListarDecretosQuery) {
    return repository.listar(query);
  },

  anios() {
    return repository.anios();
  },

  async programas() {
    const anio = new Date().getFullYear();
    return { anio, data: await repository.programas(anio) };
  },

  async obtener(folio: string) {
    const decreto = await repository.obtener(folio);
    if (!decreto) throw new AppError('Decreto no encontrado', 404);
    const detalles = await repository.detalles(folio);
    const idsMarcos = [...new Set(detalles.flatMap((detalle) => detalle.corr_mar === null ? [] : [detalle.corr_mar]))];
    const idsGlosas = [...new Set(detalles.flatMap((detalle) => detalle.corr_detmar === null ? [] : [detalle.corr_detmar]))];
    const [marcos, glosas] = await Promise.all([
      repository.marcosPorIds(idsMarcos),
      repository.glosasPorIds(idsGlosas),
    ]);
    const programas = new Map(marcos.map((marco) => [marco.corr_mar, marco.toJSON()]));
    const glosasPorMarco = new Map(glosas.map((glosa) => [`${glosa.corr_mar}:${glosa.corr_detmar}`, glosa.toJSON()]));
    return {
      ...decreto.toJSON(),
      detalles: detalles.map((detalle) => ({
        ...detalle.toJSON(),
        programa: detalle.corr_mar === null ? null : programas.get(detalle.corr_mar) ?? null,
        glosa: glosasPorMarco.get(`${detalle.corr_mar}:${detalle.corr_detmar}`) ?? null,
      })),
    };
  },
};
