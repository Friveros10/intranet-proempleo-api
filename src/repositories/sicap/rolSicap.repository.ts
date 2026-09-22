import { RolSicapModel } from '../../models/RolSicap.model';

export const rolSicapRepository = {
  async findAll(): Promise<RolSicapModel[]> {
    return RolSicapModel.findAll();
  },

  async findById(corr_rol: number): Promise<RolSicapModel | null> {
    return RolSicapModel.findByPk(corr_rol);
  },
};
