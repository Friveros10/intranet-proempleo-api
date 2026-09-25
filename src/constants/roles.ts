/**
 * Perfiles habilitados actualmente en el sistema, identificados por su corr_rol
 * (coincide con los definidos en seeders/202609210001-reemplazo-roles-permisos.ts).
 * Cualquier otro corr_rol legacy queda fuera del login y del módulo de usuarios.
 * Si se agrega un nuevo perfil al seeder, debe sumarse también aquí.
 */
export const CORR_ROL_VALIDOS = [100, 101, 102] as const;

export type CorrRolValido = (typeof CORR_ROL_VALIDOS)[number];

export function esCorrRolValido(corr_rol: number | null | undefined): corr_rol is CorrRolValido {
  return corr_rol != null && (CORR_ROL_VALIDOS as readonly number[]).includes(corr_rol);
}
