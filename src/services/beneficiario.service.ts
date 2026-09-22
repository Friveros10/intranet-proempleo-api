import { beneficiarioRepository, FichaBeneficiarioRow } from '../repositories/sicap/beneficiario.repository';
import { proyectoRepository } from '../repositories/sicap/proyecto.repository';
import { ProyectoModel } from '../models/sicap/Proyecto.model';
import { AppError } from '../utils/AppError';

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
    rutFormateado: string
  ): Promise<{ beneficiario: FichaBeneficiarioRow; proyecto: ProyectoModel }> {
    const rut = limpiarRut(rutFormateado);
    const ficha = await beneficiarioRepository.findByRutFromBenPro(rut);
    if (!ficha) {
      throw new AppError('No se encontró un beneficiario con ese RUT', 404);
    }

    const proyecto = await proyectoRepository.findByFolio(ficha.folio_vigente);
    if (!proyecto) {
      throw new AppError('El proyecto asociado al beneficiario no existe', 404);
    }

    return { beneficiario: ficha, proyecto };
  },
};
