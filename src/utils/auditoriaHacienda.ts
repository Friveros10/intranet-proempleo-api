import type { DecretoHacienda } from '../models/DecretosHacienda.model';
import type { DecretoHaciendaDetalleProempleo } from '../models/DecretosHaciendaDetalleProempleo.model';
import { diferenciasAuditables, valorAuditable, type CamposAuditables } from './auditoriaCambios';

type Detalle = DecretoHaciendaDetalleProempleo & {
  programa: { nombre_mar: string | null } | null;
  glosa: { nom_detmar: string } | null;
};

const camposDecreto: CamposAuditables<DecretoHacienda> = [
  ['fec_dechac', 'Fecha'], ['mon_dechac', 'Monto del decreto'],
  ['obs_dechac', 'Observación'], ['est_dechac', 'Estado'],
];
const camposDetalle: CamposAuditables<DecretoHaciendaDetalleProempleo> = [
  ['corr_mar', 'Programa'], ['origen_mar', 'Origen del programa'], ['corr_detmar', 'Glosa del programa'],
  ['glosa_dethac', 'Descripción de glosa'], ['acc_dethac', 'Acción'], ['mon_dethac', 'Monto'],
];

function ubicacion(detalle: Detalle): string {
  const programa = detalle.programa?.nombre_mar ?? detalle.corr_mar;
  const glosa = detalle.glosa?.nom_detmar ?? (detalle.corr_detmar === 0 ? 'Ejecución' : detalle.glosa_dethac ?? detalle.corr_detmar);
  return `Detalle ${detalle.corr_dethac} del programa ${valorAuditable(programa)}, glosa ${valorAuditable(glosa)}`;
}

function describirDetalle(detalle: Detalle, evento: string): string {
  const campos = camposDetalle.map(([campo, nombre]) => `${nombre} ${valorAuditable(detalle[campo])}`);
  return `${ubicacion(detalle)} ${evento} (${campos.join(', ')})`;
}

export function describirCambiosHacienda(
  anterior: DecretoHacienda,
  detallesAnteriores: readonly Detalle[],
  actualizado: DecretoHacienda & { detalles: readonly Detalle[] },
): string {
  const cambios = diferenciasAuditables(anterior, actualizado, camposDecreto);
  const anteriores = new Map(detallesAnteriores.map((detalle) => [detalle.corr_dethac, detalle]));

  for (const detalle of actualizado.detalles) {
    const previo = anteriores.get(detalle.corr_dethac);
    if (previo) {
      const modificados = diferenciasAuditables(previo, detalle, camposDetalle);
      if (modificados.length) cambios.push(`${ubicacion(previo)} modificado (${modificados.join(', ')})`);
      anteriores.delete(detalle.corr_dethac);
    } else {
      cambios.push(describirDetalle(detalle, 'agregado'));
    }
  }

  for (const detalle of anteriores.values()) cambios.push(describirDetalle(detalle, 'eliminado'));
  return cambios.length
    ? `Decreto de Hacienda ${actualizado.fol_dechac} actualizado. ${cambios.join(' · ')}.`
    : `Decreto de Hacienda ${actualizado.fol_dechac} guardado sin cambios.`;
}
