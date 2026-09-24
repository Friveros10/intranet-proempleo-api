import { planEgresoHistoricoRepository } from '../repositories/sicap/planEgresoHistorico.repository';
import { PlanEgresoHistoricoModel } from '../models/PlanEgresoHistorico.model';
import { AppError } from '../utils/AppError';
import { parseRut } from '../utils/rut';

export function mensajePlanEgreso(anio: number | null): string {
  return `El Rut no puede volver a ingresar al programa, ya que salio por plan de egreso el año ${anio ?? 'registrado'}`;
}

export const planEgresoHistoricoService = {
  async buscarPorRut(rutFormateado: string): Promise<PlanEgresoHistoricoModel | null> {
    const { cuerpo } = parseRut(rutFormateado);
    return planEgresoHistoricoRepository.findByRun(cuerpo);
  },

  async validarPuedeIngresarPorRun(run: number): Promise<void> {
    const planEgreso = await planEgresoHistoricoRepository.findByRun(run);
    if (planEgreso) {
      throw new AppError(mensajePlanEgreso(planEgreso.anio), 409);
    }
  },
};
