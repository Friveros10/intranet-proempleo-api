import { usuarios, usuarioRol, roles } from '../database/inMemoryDb';
import { Usuario } from '../models/Usuario';

export const usuarioRepository = {
  findByUsernameOrEmail(identificador: string): Usuario | undefined {
    const value = identificador.trim().toLowerCase();
    return usuarios.find(
      (u) => u.username.toLowerCase() === value || u.email.toLowerCase() === value
    );
  },

  findById(id: string): Usuario | undefined {
    return usuarios.find((u) => u.id === id);
  },

  registrarIntentoFallido(id: string): void {
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) return;
    usuario.intentosFallidos += 1;
    if (usuario.intentosFallidos >= 5) {
      usuario.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    usuario.updatedAt = new Date().toISOString();
  },

  resetearIntentosFallidos(id: string): void {
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) return;
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    usuario.updatedAt = new Date().toISOString();
  },

  getRolesDeUsuario(usuarioId: string): string[] {
    const rolIds = usuarioRol.filter((ur) => ur.usuarioId === usuarioId).map((ur) => ur.rolId);
    return roles.filter((r) => rolIds.includes(r.id)).map((r) => r.nombre);
  },
};
