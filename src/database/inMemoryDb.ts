import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { Usuario } from '../models/Usuario';
import { Rol, UsuarioRol } from '../models/Rol';
import { Permiso, RolPermiso } from '../models/Permiso';
import { AuditLog } from '../models/AuditLog';

/**
 * Base de datos EN MEMORIA (equivalente a un "localStorage" del lado servidor).
 * Simula las tablas usuarios, roles, permisos, rol_permiso, usuario_rol y audit_log
 * mientras no exista una conexión real a SQL Server. Los repositorios son la única
 * capa que conoce este módulo, por lo que reemplazarlo por SQL Server a futuro
 * solo implica reescribir los repositorios, no los servicios/controladores.
 */

const now = () => new Date().toISOString();

const ROL_ADMIN_ID = 'rol-admin';
const ROL_USUARIO_ID = 'rol-usuario';

export const permisos: Permiso[] = [
  { id: 'perm-usuarios-ver', codigo: 'usuarios:ver', descripcion: 'Ver usuarios' },
  { id: 'perm-usuarios-crear', codigo: 'usuarios:crear', descripcion: 'Crear usuarios' },
  { id: 'perm-usuarios-editar', codigo: 'usuarios:editar', descripcion: 'Editar usuarios' },
  { id: 'perm-roles-ver', codigo: 'roles:ver', descripcion: 'Ver roles y permisos' },
  { id: 'perm-reemplazos-ver', codigo: 'reemplazos:ver', descripcion: 'Ver reemplazos' },
  { id: 'perm-reemplazos-crear', codigo: 'reemplazos:crear', descripcion: 'Crear reemplazos' },
  { id: 'perm-reemplazos-aprobar', codigo: 'reemplazos:aprobar', descripcion: 'Aprobar reemplazos' },
  { id: 'perm-dashboard-ver', codigo: 'dashboard:ver', descripcion: 'Ver dashboard' },
];

export const roles: Rol[] = [
  { id: ROL_ADMIN_ID, nombre: 'ADMIN', descripcion: 'Administrador del sistema' },
  { id: ROL_USUARIO_ID, nombre: 'USUARIO', descripcion: 'Usuario estándar' },
];

export const rolPermiso: RolPermiso[] = [
  // ADMIN: todos los permisos
  ...permisos.map((p) => ({ rolId: ROL_ADMIN_ID, permisoId: p.id })),
  // USUARIO: permisos acotados
  { rolId: ROL_USUARIO_ID, permisoId: 'perm-dashboard-ver' },
  { rolId: ROL_USUARIO_ID, permisoId: 'perm-reemplazos-ver' },
  { rolId: ROL_USUARIO_ID, permisoId: 'perm-reemplazos-crear' },
];

export const usuarios: Usuario[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    email: 'admin@mtps.local',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    nombre: 'Administrador',
    activo: true,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'usr-demo',
    username: 'demo',
    email: 'demo@mtps.local',
    passwordHash: bcrypt.hashSync('Demo123!', 10),
    nombre: 'Usuario Demo',
    activo: true,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'usr-test',
    username: 'test',
    email: 'test@mtps.local',
    passwordHash: bcrypt.hashSync('Test123!', 10),
    nombre: 'Usuario de Prueba',
    activo: true,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    createdAt: now(),
    updatedAt: now(),
  },
];

export const usuarioRol: UsuarioRol[] = [
  { usuarioId: 'usr-admin', rolId: ROL_ADMIN_ID },
  { usuarioId: 'usr-demo', rolId: ROL_USUARIO_ID },
];

export const auditLog: AuditLog[] = [];

export function nextId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function timestamp(): string {
  return now();
}
