export interface Usuario {
  id: string;
  username: string;
  email: string;
  /** Hash bcrypt, nunca exponer en respuestas */
  passwordHash: string;
  nombre: string;
  activo: boolean;
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UsuarioSafe = Omit<Usuario, 'passwordHash'>;

export function toSafeUsuario(usuario: Usuario): UsuarioSafe {
  const { passwordHash, ...safe } = usuario;
  return safe;
}
