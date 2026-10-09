import { AppError } from '../utils/AppError';
import { proyectoRepository } from '../repositories/sicap/proyecto.repository';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';

const PERMISO_VER_TODAS_REGIONES = 'REM_VERALL';

export const proyectoService = {
  async buscarPorFolio(folio: number, rutUsuario: number) {
    const folioNumerico = Number(folio);
    if (!Number.isInteger(folioNumerico) || folioNumerico <= 0) {
      throw new AppError('Folio de proyecto inválido', 400);
    }

    const [proyecto, usuario, permisos] = await Promise.all([
      proyectoRepository.findByFolioConCupo(folioNumerico),
      usuarioSicapRepository.findByRut(rutUsuario),
      usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
    ]);
    if (!proyecto) {
      throw new AppError('No se encontró el proyecto con ese folio', 404);
    }
    if (
      !permisos.includes(PERMISO_VER_TODAS_REGIONES) &&
      proyecto.reg_pro !== usuario?.reg_usu
    ) {
      throw new AppError('El proyecto no pertenece a tu zona', 403);
    }

    return proyecto;
  },
};
