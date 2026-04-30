import type { CotizacionDoc } from '../types/cotizacion';
import { dateFromFirestore } from './formatters';

function escapeCell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function productosText(row: CotizacionDoc): string {
  const list = row.productosAdicionales ?? [];
  if (!list.length) return '';
  return list
    .map((p) => `${p.nombre} ($${p.precioUsd})`)
    .join(' | ');
}

export function exportCotizacionesToCsv(rows: CotizacionDoc[]): string {
  const headers = [
    'Empresa',
    'Nombre',
    'Email',
    'Plan',
    'Precio Plan',
    'Productos adicionales',
    'Total',
    'Fecha',
  ];

  const lines = [headers.map(escapeCell).join(',')];

  for (const row of rows) {
    const d = dateFromFirestore(row.creadoEn);
    const fecha = d
      ? d.toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const cells = [
      row.cliente?.empresa ?? '',
      row.cliente?.nombre ?? '',
      row.cliente?.email ?? '',
      row.plan?.nombre ?? row.plan?.valor ?? '',
      String(row.plan?.precioUsd ?? ''),
      productosText(row),
      String(row.totales?.totalEstimadoUsd ?? ''),
      fecha,
    ];
    lines.push(cells.map((c) => escapeCell(String(c))).join(','));
  }

  // BOM para Excel con UTF-8
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
