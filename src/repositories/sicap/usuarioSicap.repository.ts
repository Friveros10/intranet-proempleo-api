import { UsuarioSicapModel } from '../../models/sicap/UsuarioSicap.model';
import { RolSicapModel } from '../../models/sicap/RolSicap.model';
import { RolMenuModel } from '../../models/sicap/RolMenu.model';
import { MenuModel } from '../../models/sicap/Menu.model';

export const usuarioSicapRepository = {
  async findAll(): Promise<UsuarioSicapModel[]> {
    return UsuarioSicapModel.findAll();
  },

  async findByRut(rut_usu: number): Promise<UsuarioSicapModel | null> {
    return UsuarioSicapModel.findByPk(rut_usu, { include: [{ model: RolSicapModel, as: 'rol' }] });
  },

  async findByLogin(log_usu: string): Promise<UsuarioSicapModel | null> {
    return UsuarioSicapModel.findOne({ where: { log_usu }, include: [{ model: RolSicapModel, as: 'rol' }] });

  },

  /** Permisos del usuario derivados de los menús habilitados para su rol (rol_menu + menus) */
  async getPermisosDeUsuario(rut_usu: number): Promise<string[]> {
    const usuario = await UsuarioSicapModel.findByPk(rut_usu);
    if (!usuario?.corr_rol) return [];

    const rolMenus = await RolMenuModel.findAll({
      where: { corr_rol: usuario.corr_rol },
      include: [{ model: MenuModel, as: 'menu' }],
    });

    const codigos = rolMenus
      .map((rm) => (rm as RolMenuModel & { menu?: MenuModel }).menu?.cod_men)
      .filter((cod): cod is string => Boolean(cod));

    return Array.from(new Set(codigos));
  },
};
