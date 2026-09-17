export interface Permiso {
  id: string;
  codigo: string;
  descripcion: string;
}

export interface RolPermiso {
  rolId: string;
  permisoId: string;
}
