/** Tabla dbo.roles (legacy SICAP, distinto del Rol de RBAC de esta API) */
export interface RolSicap {
  corr_rol: number;
  nom_rol: string | null;
  est_rol: string | null;
}
