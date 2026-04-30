import type { CotizacionDoc } from '../types/cotizacion';
import { normalizeText } from './formatters';

export function matchesSearch(row: CotizacionDoc, rawQuery: string): boolean {
  const q = normalizeText(rawQuery);
  if (!q) return true;

  const empresa = normalizeText(row.cliente?.empresa ?? '');
  const nombre = normalizeText(row.cliente?.nombre ?? '');
  const email = normalizeText(row.cliente?.email ?? '');
  const planNombre = normalizeText(row.plan?.nombre ?? '');
  const planValor = normalizeText(row.plan?.valor ?? '');
  const planEtiqueta = normalizeText(row.plan?.etiquetaLista ?? '');

  return (
    empresa.includes(q) ||
    nombre.includes(q) ||
    email.includes(q) ||
    planNombre.includes(q) ||
    planValor.includes(q) ||
    planEtiqueta.includes(q)
  );
}
