import { RolMenuModel } from '../../models/sicap/RolMenu.model';
import { MenuModel } from '../../models/sicap/Menu.model';

export const rolMenuRepository = {
  async findAll(): Promise<RolMenuModel[]> {
    return RolMenuModel.findAll();
  },

  async findByRol(corr_rol: number): Promise<RolMenuModel[]> {
    return RolMenuModel.findAll({ where: { corr_rol } });
  },

  /** Menús habilitados para un rol, usados para derivar permisos en el login */
  async findMenusByRol(corr_rol: number): Promise<RolMenuModel[]> {
    return RolMenuModel.findAll({ where: { corr_rol }, include: [{ model: MenuModel, as: 'menu' }] });
  },
};
