import { roles, permisos, rolPermiso, usuarioRol } from '../database/inMemoryDb';

export const rolRepository = {
  findAll() {
    return roles;
  },

  findByNombre(nombre: string) {
    return roles.find((r) => r.nombre === nombre);
  },

  getPermisosDeRol(rolId: string): string[] {
    const permisoIds = rolPermiso.filter((rp) => rp.rolId === rolId).map((rp) => rp.permisoId);
    return permisos.filter((p) => permisoIds.includes(p.id)).map((p) => p.codigo);
  },

  getPermisosDeUsuario(usuarioId: string): string[] {
    const rolIds = usuarioRol.filter((ur) => ur.usuarioId === usuarioId).map((ur) => ur.rolId);
    const permisoIds = rolPermiso
      .filter((rp) => rolIds.includes(rp.rolId))
      .map((rp) => rp.permisoId);
    const unicos = new Set(permisoIds);
    return permisos.filter((p) => unicos.has(p.id)).map((p) => p.codigo);
  },
};
