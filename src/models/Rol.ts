export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface UsuarioRol {
  usuarioId: string;
  rolId: string;
}
