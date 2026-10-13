export const DOCUMENTOS_AUDITORIA = {
  certCotizaciones: {
    url: 'certCotizacionesUrl',
    nombre: 'certCotizacionesNombre',
    estado: 'estadoCert',
    comentario: 'comentarioCert',
    label: 'Certificado de cotizaciones',
  },
  liquidacion: {
    url: 'liquidacionUrl',
    nombre: 'liquidacionNombre',
    estado: 'estadoLiquidacion',
    comentario: 'comentarioLiquidacion',
    label: 'Liquidación',
  },
} as const;

export type TipoDocumentoAuditoria = keyof typeof DOCUMENTOS_AUDITORIA;

export function puedeVerTodasRegionesAuditoria(roles: string[]): boolean {
  return roles.some((rol) => rol === 'ADMIN' || rol === 'MINISTERIO');
}

// INTENDENCIA solo accede al módulo de auditoría si pertenece a esta región (Biobío).
export const REGION_AUDITORIA_INTENDENCIA = 8;

export function puedeAccederAuditoria(roles: string[], regionUsuario: number | null | undefined): boolean {
  if (puedeVerTodasRegionesAuditoria(roles)) return true;
  return roles.includes('INTENDENCIA') && Number(regionUsuario) === REGION_AUDITORIA_INTENDENCIA;
}
