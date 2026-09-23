import { BeneficiarioModel } from '../models/Beneficiario.model';
import { ProyectoModel } from '../models/Proyecto.model';
import { BenProModel } from '../models/BenPro.model';
import { UsuarioSicapModel } from '../models/UsuarioSicap.model';
import { RolSicapModel } from '../models/RolSicap.model';
import { RolMenuModel } from '../models/RolMenu.model';
import { MenuModel } from '../models/Menu.model';
import { ReemplazoBenProyectoModel } from '../models/ReemplazoBenProyecto.model';
import { DocReemplazoBenProyectoModel } from '../models/DocReemplazoBenProyecto.model';
import { RegionModel } from '../models/Region.model';
import { CiudadModel } from '../models/Ciudad.model';

/**
 * Define todas las relaciones (Sequelize) entre los modelos legacy SICAP y los
 * modelos propios de la app. Debe importarse una única vez antes de usar los
 * modelos (ver src/database/sequelize.ts / server.ts).
 */
export function registrarAsociaciones(): void {
  // Beneficiarios <-> BenPro
  BeneficiarioModel.hasMany(BenProModel, { foreignKey: 'rut_ben', sourceKey: 'rut_ben', as: 'benpros' });
  BenProModel.belongsTo(BeneficiarioModel, { foreignKey: 'rut_ben', targetKey: 'rut_ben', as: 'beneficiario' });

  // Proyectos <-> BenPro
  ProyectoModel.hasMany(BenProModel, { foreignKey: 'fol_pro', sourceKey: 'fol_pro', as: 'benpros' });
  BenProModel.belongsTo(ProyectoModel, { foreignKey: 'fol_pro', targetKey: 'fol_pro', as: 'proyecto' });

  // Proyecto <-> catálogos
  ProyectoModel.belongsTo(RegionModel, { foreignKey: 'reg_pro', targetKey: 'cod_region', as: 'region' });
  ProyectoModel.belongsTo(CiudadModel, { foreignKey: 'ciu_pro', targetKey: 'cod_ciu', as: 'ciudad' });

  // Usuario <-> roles
  RolSicapModel.hasMany(UsuarioSicapModel, { foreignKey: 'corr_rol', sourceKey: 'corr_rol', as: 'usuarios' });
  UsuarioSicapModel.belongsTo(RolSicapModel, { foreignKey: 'corr_rol', targetKey: 'corr_rol', as: 'rol' });

  // rol_menu <-> menus
  MenuModel.hasMany(RolMenuModel, { foreignKey: 'corr_men', sourceKey: 'corr_men', as: 'rolMenus' });
  RolMenuModel.belongsTo(MenuModel, { foreignKey: 'corr_men', targetKey: 'corr_men', as: 'menu' });

  // rol_menu <-> roles
  RolSicapModel.hasMany(RolMenuModel, { foreignKey: 'corr_rol', sourceKey: 'corr_rol', as: 'rolMenus' });
  RolMenuModel.belongsTo(RolSicapModel, { foreignKey: 'corr_rol', targetKey: 'corr_rol', as: 'rol' });

  // Reemplazo_benpro <-> Beneficiarios / Proyectos
  ReemplazoBenProyectoModel.belongsTo(BeneficiarioModel, {
    foreignKey: 'idBeneficiarioProyecto',
    targetKey: 'rut_ben',
    as: 'beneficiarioActual',
  });
  ReemplazoBenProyectoModel.belongsTo(BeneficiarioModel, {
    foreignKey: 'idBeneficiarioNuevo',
    targetKey: 'rut_ben',
    as: 'beneficiarioNuevo',
  });
  ReemplazoBenProyectoModel.belongsTo(ProyectoModel, {
    foreignKey: 'idProyecto',
    targetKey: 'fol_pro',
    as: 'proyecto',
  });
  ReemplazoBenProyectoModel.belongsTo(UsuarioSicapModel, {
    foreignKey: 'rutUsuarioSolicitante',
    targetKey: 'rut_usu',
    as: 'usuarioSolicitante',
  });

  // Doc_reemplazo_benpro <-> Reemplazo_benpro / Beneficiarios
  ReemplazoBenProyectoModel.hasMany(DocReemplazoBenProyectoModel, {
    foreignKey: 'idReemplazoBenProyecto',
    sourceKey: 'id',
    as: 'documentos',
  });
  DocReemplazoBenProyectoModel.belongsTo(ReemplazoBenProyectoModel, {
    foreignKey: 'idReemplazoBenProyecto',
    targetKey: 'id',
    as: 'reemplazo',
  });
  DocReemplazoBenProyectoModel.belongsTo(BeneficiarioModel, {
    foreignKey: 'idBeneficiario',
    targetKey: 'rut_ben',
    as: 'beneficiario',
  });
}
