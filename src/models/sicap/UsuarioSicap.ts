/** Tabla dbo.Usuario (legacy SICAP, distinto del Usuario de autenticación de esta API) */
export interface UsuarioSicap {
  rut_usu: number;
  log_usu: string | null;
  dig_usu: string | null;
  niv_usu: string | null;
  nom_usu: string | null;
  pat_usu: string | null;
  cla_usu: string | null;
  mat_usu: string | null;
  dir_usu: string | null;
  reg_usu: number | null;
  ciu_usu: number | null;
  com_usu: number | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  corr_rol: number | null;
  ema_usu: string | null;
  cla2_usu: string | null;
  est_usu: string | null;
  fec_cad_pass: Date | null;
}

export type UsuarioSicapSafe = Omit<UsuarioSicap, 'cla_usu' | 'cla2_usu'>;

export function toSafeUsuarioSicap(usuario: UsuarioSicap): UsuarioSicapSafe {
  const { cla_usu, cla2_usu, ...safe } = usuario;
  return safe;
}
