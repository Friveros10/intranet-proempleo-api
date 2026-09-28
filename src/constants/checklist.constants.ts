export const CRITERIOS_REEMPLAZO = [
  { id: 1, nombre: 'Criterio 1' },
  { id: 2, nombre: 'Criterio 2' },
  { id: 3, nombre: 'Criterio 3' },
  { id: 4, nombre: 'Criterio 4' },
  { id: 5, nombre: 'Criterio 5' },
] as const;

export const CRITERIO_VALOR_MIN = 0;
export const CRITERIO_VALOR_MAX = 10;

export const CAMPOS_CHECKLIST_REEMPLAZO = [
  'criterio_1',
  'criterio_2',
  'criterio_3',
  'criterio_4',
  'criterio_5',
  'ponderacion',
] as const;

export const ROLES_CHECKLIST_REEMPLAZO = ['ADMIN', 'MINISTERIO'];

export function puedeGestionarChecklist(roles: string[] = []): boolean {
  return roles.some((rol) => ROLES_CHECKLIST_REEMPLAZO.includes(rol.trim().toUpperCase()));
}
