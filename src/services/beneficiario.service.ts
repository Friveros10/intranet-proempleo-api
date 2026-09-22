import { beneficiarioRepository, FichaBeneficiarioRow } from '../repositories/sicap/beneficiario.repository';
import { proyectoRepository } from '../repositories/sicap/proyecto.repository';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { ProyectoModel } from '../models/Proyecto.model';
import { AppError } from '../utils/AppError';

const PERMISO_VER_TODAS_REGIONES = 'REM_VERALL';

// Convierte un RUT formateado ("11.111.111-1" o "11111111-1") al cuerpo numérico, descartando el dígito verificador
function limpiarRut(rutFormateado: string): number {
  const soloAlfanumerico = rutFormateado.replace(/[^0-9kK]/g, '');
  const cuerpo = soloAlfanumerico.slice(0, -1);
  const rut = Number(cuerpo);
  if (!cuerpo || Number.isNaN(rut)) {
    throw new AppError('RUT inválido', 400);
  }
  return rut;
}

export const beneficiarioService = {
  async buscarFichaPorRut(rutFormateado: string): Promise<FichaBeneficiarioRow> {
    const rut = limpiarRut(rutFormateado);
    const ficha = await beneficiarioRepository.findByRutFromBenPro(rut);
    if (!ficha) {
      throw new AppError('No se encontró un beneficiario con ese RUT', 404);
    }
    return ficha;
  },

  async buscarActivoPorRut(
    rutFormateado: string,
    rutUsuario: number
  ): Promise<{ beneficiario: FichaBeneficiarioRow; proyecto: ProyectoModel }> {
    const rut = limpiarRut(rutFormateado);
    const [ficha, usuario, permisos] = await Promise.all([
      beneficiarioRepository.findByRutFromBenPro(rut),
      usuarioSicapRepository.findByRut(rutUsuario),
      usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
    ]);
    if (!ficha) {
      throw new AppError('No se encontró un beneficiario con ese RUT', 404);
    }

    const puedeVerTodasLasRegiones = permisos.includes(PERMISO_VER_TODAS_REGIONES);
    if (!puedeVerTodasLasRegiones && ficha.reg_ben !== usuario?.reg_usu) {
      throw new AppError('El beneficiario no pertenece a tu zona', 404);
    }

    if (ficha.tiene_reemplazo > 0) {
      throw new AppError('El beneficiario tiene un reemplazo en curso', 404);
    }

    const proyecto = await proyectoRepository.findByFolio(ficha.folio_vigente);
    if (!proyecto) {
      throw new AppError('El proyecto asociado al beneficiario no existe', 404);
    }

    return { beneficiario: ficha, proyecto };
  },
};
