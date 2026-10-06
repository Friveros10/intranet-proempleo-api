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
