import { sequelize } from '../src/database/sequelize';
import { RolSicapModel } from '../src/models/RolSicap.model';
import { MenuModel } from '../src/models/Menu.model';
import { RolMenuModel } from '../src/models/RolMenu.model';

/**
 * Seeder del módulo de Reemplazo de Beneficiarios de Proyecto.
 *
 * Crea los 3 roles solicitados (ADMIN, MINISTERIO, INTENDENCIA) y los permisos
 * (dbo.menus + dbo.rol_menu) asociados exclusivamente a dicho módulo, ya que el
 * resto de los módulos del sistema legacy aún no están desarrollados.
 *
 * Reglas de negocio consideradas para asignar los permisos:
 * - ADMIN: acceso total, ve todos los registros sin importar la región, puede
 *   crear, aprobar/rechazar solicitudes y aprobar/rechazar documentos.
 * - MINISTERIO: revisa y aprueba/rechaza solicitudes y documentos, ve todos los
 *   registros (mismos filtros que ADMIN), pero no crea solicitudes.
 * - INTENDENCIA: solo puede crear solicitudes y ve únicamente los registros de
 *   su propia región.
 */

interface RolSeed {
  corr_rol: number;
  nom_rol: string;
  est_rol: string;
}

interface MenuSeed {
  cod_men: string;
  Nom_men: string;
}

const ROLES: RolSeed[] = [
  { corr_rol: 100, nom_rol: 'ADMIN', est_rol: 'ACTIVO' },
  { corr_rol: 101, nom_rol: 'MINISTERIO', est_rol: 'ACTIVO' },
  { corr_rol: 102, nom_rol: 'INTENDENCIA', est_rol: 'ACTIVO' },
];

// Permisos (menús) propios del módulo de Reemplazo de Beneficiarios de Proyecto
// cod_men está limitado a VARCHAR(10) y Nom_men a VARCHAR(50) en la tabla legacy dbo.menus
const MENUS_REEMPLAZO: MenuSeed[] = [
  { cod_men: 'REM_VERALL', Nom_men: 'Reemplazo: ver todos los registros' },
  { cod_men: 'REM_VERREG', Nom_men: 'Reemplazo: ver registros de su región' },
  { cod_men: 'REM_CREAR', Nom_men: 'Reemplazo: crear solicitud' },
  { cod_men: 'REM_APROB', Nom_men: 'Reemplazo: aprobar solicitud' },
  { cod_men: 'REM_RECHAZ', Nom_men: 'Reemplazo: rechazar solicitud' },
  { cod_men: 'REM_DOCAPR', Nom_men: 'Reemplazo: aprobar documentos' },
  { cod_men: 'REM_DOCREC', Nom_men: 'Reemplazo: rechazar documentos' },
  { cod_men: 'REM_FILTR', Nom_men: 'Reemplazo: filtro por región' },
];

// Asignación de permisos por rol (usando los cod_men definidos arriba)
const PERMISOS_POR_ROL: Record<string, string[]> = {
  ADMIN: ['REM_VERALL', 'REM_CREAR', 'REM_APROB', 'REM_RECHAZ', 'REM_DOCAPR', 'REM_DOCREC', 'REM_FILTR'],
  MINISTERIO: ['REM_VERALL', 'REM_APROB', 'REM_RECHAZ', 'REM_DOCAPR', 'REM_DOCREC', 'REM_FILTR'],
  INTENDENCIA: ['REM_VERREG', 'REM_CREAR'],
};

async function seedRoles(): Promise<void> {
  for (const rol of ROLES) {
    await RolSicapModel.upsert(rol);
  }
}

async function seedMenus(): Promise<Map<string, number>> {
  const codigoACorrMen = new Map<string, number>();

  for (const menu of MENUS_REEMPLAZO) {
    const existente = await MenuModel.findOne({ where: { cod_men: menu.cod_men } });
    if (existente) {
      codigoACorrMen.set(menu.cod_men, existente.corr_men);
      continue;
    }

    // corr_men es identity en dbo.menus: se omite para que SQL Server lo autogenere
    const creado = await MenuModel.create({ cod_men: menu.cod_men, Nom_men: menu.Nom_men });
    codigoACorrMen.set(menu.cod_men, creado.corr_men);
  }

  return codigoACorrMen;
}

async function seedRolMenu(codigoACorrMen: Map<string, number>): Promise<void> {
  for (const rol of ROLES) {
    const codigosPermitidos = PERMISOS_POR_ROL[rol.nom_rol] ?? [];

    for (const codigo of codigosPermitidos) {
      const corr_men = codigoACorrMen.get(codigo);
      if (!corr_men) continue;

      const existente = await RolMenuModel.findOne({ where: { corr_rol: rol.corr_rol, corr_men } });
      if (existente) continue;

      // corr_RolMen es identity en dbo.rol_menu: se omite para que SQL Server lo autogenere
      // acc_RolMen es CHAR(2) NOT NULL en dbo.rol_menu
      await RolMenuModel.create({ corr_rol: rol.corr_rol, corr_men, acc_RolMen: 'SI' });
    }
  }
}

export async function up(): Promise<void> {
  await seedRoles();
  const codigoACorrMen = await seedMenus();
  await seedRolMenu(codigoACorrMen);
}

export async function down(): Promise<void> {
  const codigosMenu = MENUS_REEMPLAZO.map((m) => m.cod_men);
  const menus = await MenuModel.findAll({ where: { cod_men: codigosMenu } });
  const corrMenIds = menus.map((m) => m.corr_men);
  const corrRolIds = ROLES.map((r) => r.corr_rol);

  await RolMenuModel.destroy({ where: { corr_rol: corrRolIds, corr_men: corrMenIds } });
  await MenuModel.destroy({ where: { corr_men: corrMenIds } });
  await RolSicapModel.destroy({ where: { corr_rol: corrRolIds } });
}

// Permite ejecutar el seeder directamente: npx ts-node seeders/202609210001-reemplazo-roles-permisos.ts
if (require.main === module) {
  sequelize
    .authenticate()
    .then(() => up())
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Seeder de roles y permisos de Reemplazo ejecutado correctamente.');
      return sequelize.close();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error ejecutando el seeder de roles y permisos de Reemplazo:', error);
      process.exitCode = 1;
      return sequelize.close();
    });
}
