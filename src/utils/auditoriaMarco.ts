import type { MarcoProempleo } from '../models/MarcoProempleo.model';
import type { MarcoDetalleProempleo } from '../models/MarcoDetalleProempleo.model';

import { diferenciasAuditables, valorAuditable, type CamposAuditables } from './auditoriaCambios';

const camposMarco: CamposAuditables<MarcoProempleo> = [
  ['ano_mar', 'Año'], ['subtitulo_mar', 'Subtítulo'], ['item_mar', 'Ítem'],
  ['linea_mar', 'Subítem / Línea'], ['nombre_mar', 'Nombre'], ['monto_mar', 'Monto'],
  ['est_mar', 'Estado'], ['ema_mar', 'Correo'], ['tip_mar', 'Tipo'],
];
const camposGlosa: CamposAuditables<MarcoDetalleProempleo> = [
  ['glo_detmar', 'Código'], ['nom_detmar', 'Nombre'], ['acc_detmar', 'Acción'], ['mon_detmar', 'Monto'],
];

function describirGlosa(estado: 'agregada' | 'eliminada', glosa: MarcoDetalleProempleo): string {
  const datos = camposGlosa.map(([campo, nombre]) => `${nombre} ${valorAuditable(glosa[campo])}`);
  return `Glosa ${glosa.corr_detmar} ${estado} (${datos.join(', ')})`;
}

export function describirCambiosMarco(
  anterior: MarcoProempleo,
  glosasAnteriores: readonly MarcoDetalleProempleo[],
  actualizado: MarcoProempleo & { detalles: readonly MarcoDetalleProempleo[] },
): string {
  const cambios = diferenciasAuditables(anterior, actualizado, camposMarco);
  const anteriores = new Map(glosasAnteriores.map((glosa) => [glosa.corr_detmar, glosa]));

  for (const glosa of actualizado.detalles) {
    const previa = anteriores.get(glosa.corr_detmar);
    if (previa) {
      const modificados = diferenciasAuditables(previa, glosa, camposGlosa);
      if (modificados.length) cambios.push(`Glosa ${glosa.corr_detmar} modificada (${modificados.join(', ')})`);
      anteriores.delete(glosa.corr_detmar);
    } else {
      cambios.push(describirGlosa('agregada', glosa));
    }
  }

  for (const glosa of anteriores.values()) cambios.push(describirGlosa('eliminada', glosa));
  return cambios.length
    ? `Marco ${actualizado.corr_mar} actualizado. ${cambios.join(' · ')}.`
    : `Marco ${actualizado.corr_mar} guardado sin cambios en los datos o las glosas.`;
}
