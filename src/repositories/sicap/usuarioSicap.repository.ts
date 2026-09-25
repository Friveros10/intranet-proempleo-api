import { Op } from 'sequelize';
import { UsuarioSicapModel } from '../../models/UsuarioSicap.model';
import { RolSicapModel } from '../../models/RolSicap.model';
import { RolMenuModel } from '../../models/RolMenu.model';
import { MenuModel } from '../../models/Menu.model';
import { RegionModel } from '../../models/Region.model';
import { CiudadModel } from '../../models/Ciudad.model';
import { ComunaModel } from '../../models/Comuna.model';
import { sequelize } from '../../database/sequelize';
import { CORR_ROL_VALIDOS } from '../../constants/roles';

export const usuarioSicapRepository = {
  async findAll(): Promise<UsuarioSicapModel[]> {
    return UsuarioSicapModel.findAll();
  },

  /** Usuarios cuyo rol es uno de los 3 perfiles habilitados (ADMIN/MINISTERIO/INTENDENCIA) */
  async findAllPerfilesValidos(): Promise<UsuarioSicapModel[]> {
    return UsuarioSicapModel.findAll({
      where: { corr_rol: { [Op.in]: [...CORR_ROL_VALIDOS] } },
      include: [
        { model: RolSicapModel, as: 'rol', attributes: [], required: false },
        { model: RegionModel, as: 'region', attributes: [], required: false },
        { model: CiudadModel, as: 'ciudad', attributes: [], required: false },
        { model: ComunaModel, as: 'comuna', attributes: [], required: false },
      ],
      attributes: [
        'rut_usu', 'dig_usu', 'nom_usu', 'pat_usu', 'mat_usu', 'log_usu',
        'reg_usu', 'ciu_usu', 'com_usu', 'dir_usu', 'ema_usu', 'est_usu', 'corr_rol',
        [sequelize.col('region.Nom_region'), 'nombre_region'],
        [sequelize.col('ciudad.nom_ciu'), 'nombre_ciudad'],
        [sequelize.col('comuna.nom_com'), 'nombre_comuna'],
        [sequelize.col('rol.nom_rol'), 'nombre_rol'],
      ],
      order: [['nom_usu', 'ASC']],
      raw: true,
    });
  },

  async existeLogin(log_usu: string): Promise<boolean> {
    const usuario = await UsuarioSicapModel.findOne({ where: { log_usu }, attributes: ['rut_usu'] });
    return !!usuario;
  },

  async findByRut(rut_usu: number): Promise<UsuarioSicapModel | null> {
    return UsuarioSicapModel.findByPk(rut_usu, { include: [{ model: RolSicapModel, as: 'rol' }] });
  },

  async findByLogin(log_usu: string): Promise<UsuarioSicapModel | null> {
    return UsuarioSicapModel.findOne({ where: { log_usu }, include: [{ model: RolSicapModel, as: 'rol' }] });

  },

  async crear(data: {
    rut_usu: number;
    dig_usu: string;
    nom_usu: string;
    pat_usu: string;
    mat_usu: string;
    reg_usu: number;
    corr_rol: number;
    log_usu: string;
    cla_usu: string;
    usu_cre: string;
  }): Promise<UsuarioSicapModel> {
    return UsuarioSicapModel.create({
      ...data,
      est_usu: 'ACTIVO',
      fec_cre: sequelize.fn('GETDATE') as unknown as Date,
    });
  },

  async actualizarDatosPersonales(
    rut_usu: number,
    data: { dir_usu: string | null; ciu_usu: number | null; com_usu: number | null; ema_usu: string | null },
  ): Promise<void> {
    await UsuarioSicapModel.update(
      { ...data, fec_mod: sequelize.fn('GETDATE') as unknown as Date },
      { where: { rut_usu } },
    );
  },

  async cambiarClave(rut_usu: number, cla_usu: string): Promise<void> {
    await UsuarioSicapModel.update(
      { cla_usu, fec_mod: sequelize.fn('GETDATE') as unknown as Date },
      { where: { rut_usu } },
    );
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
