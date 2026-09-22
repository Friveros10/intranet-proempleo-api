import { ProyectoModel } from '../../models/Proyecto.model';

export const proyectoRepository = {
  async findAll(): Promise<ProyectoModel[]> {
    return ProyectoModel.findAll();
  },

  async findByFolio(fol_pro: number): Promise<ProyectoModel | null> {
    return ProyectoModel.findByPk(fol_pro);
  },
};
