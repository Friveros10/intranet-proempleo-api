import { PlanEgresoHistoricoModel } from '../../models/PlanEgresoHistorico.model';

export const planEgresoHistoricoRepository = {
  async findByRun(run: number): Promise<PlanEgresoHistoricoModel | null> {
    return PlanEgresoHistoricoModel.findOne({
      where: { RUN: run },
      order: [
        ['anio', 'DESC'],
        ['FECHAREV', 'DESC'],
      ],
    });
  },
};
