import { BenProModel } from '../../models/BenPro.model';

export const benProRepository = {
  async findAll(): Promise<BenProModel[]> {
    return BenProModel.findAll();
  },

  async findByProyecto(fol_pro: number): Promise<BenProModel[]> {
    return BenProModel.findAll({ where: { fol_pro } });
  },

  async findByBeneficiario(rut_ben: number): Promise<BenProModel[]> {
    return BenProModel.findAll({ where: { rut_ben } });
  },
};
