import { MenuModel } from '../../models/sicap/Menu.model';

export const menuRepository = {
  async findAll(): Promise<MenuModel[]> {
    return MenuModel.findAll();
  },

  async findById(corr_men: number): Promise<MenuModel | null> {
    return MenuModel.findByPk(corr_men);
  },
};
