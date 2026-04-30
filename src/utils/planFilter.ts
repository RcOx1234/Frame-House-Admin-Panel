import type { CotizacionDoc, PlanFilterValue } from '../types/cotizacion';
import { normalizeText } from './formatters';

export function matchesPlanFilter(row: CotizacionDoc, filter: PlanFilterValue): boolean {
  if (filter === 'todos') return true;
  const haystack = normalizeText(
    `${row.plan?.valor ?? ''} ${row.plan?.nombre ?? ''} ${row.plan?.etiquetaLista ?? ''}`
  );
  return haystack.includes(filter);
}
