export type CamposAuditables<T> = readonly (readonly [keyof T, string])[];

export function valorAuditable(valor: unknown): string {
  if (valor == null || valor === '') return 'sin valor';
  if (valor instanceof Date) {
    return Number.isFinite(valor.getTime()) ? valor.toISOString().replace(/T00:00:00\.000Z$/, '') : 'fecha inválida';
  }
  return typeof valor === 'string' ? JSON.stringify(valor) : String(valor);
}

export function diferenciasAuditables<T>(antes: T, despues: T, campos: CamposAuditables<T>): string[] {
  return campos.flatMap(([campo, nombre]) => {
    const previo = valorAuditable(antes[campo]);
    const nuevo = valorAuditable(despues[campo]);
    return previo === nuevo ? [] : [`${nombre} de ${previo} a ${nuevo}`];
  });
}
