import ExcelJS from 'exceljs';
import type { CotizacionDoc } from '../types/cotizacion';
import { dateFromFirestore } from './formatters';

function productosText(row: CotizacionDoc): string {
  const list = row.productosAdicionales ?? [];
  if (!list.length) return '';
  return list.map((p) => `${p.nombre} (${p.precioUsd} US$)`).join(' | ');
}

export async function exportCotizacionesToXlsx(filename: string, rows: CotizacionDoc[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FRAME HOUSE Admin Panel';
  wb.created = new Date();

  const ws = wb.addWorksheet('Cotizaciones', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'ID', key: 'id', width: 14 },
    { header: 'Empresa', key: 'empresa', width: 22 },
    { header: 'Nombre', key: 'nombre', width: 18 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Plan', key: 'plan', width: 18 },
    { header: 'Precio plan (US$)', key: 'precioPlan', width: 16 },
    { header: 'Adicionales', key: 'adicionales', width: 34 },
    { header: 'Subtotal plan (US$)', key: 'subPlan', width: 18 },
    { header: 'Subtotal adicionales (US$)', key: 'subAdd', width: 22 },
    { header: 'Total (US$)', key: 'total', width: 14 },
    { header: 'Fecha', key: 'fecha', width: 18 },
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFF9FAFB' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }; // neutral-900
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF374151' } },
      left: { style: 'thin', color: { argb: 'FF374151' } },
      bottom: { style: 'thin', color: { argb: 'FF374151' } },
      right: { style: 'thin', color: { argb: 'FF374151' } },
    };
  });

  for (const r of rows) {
    const d = dateFromFirestore(r.creadoEn);
    ws.addRow({
      id: r.id,
      empresa: r.cliente.empresa || '',
      nombre: r.cliente.nombre || '',
      email: r.cliente.email || '',
      plan: r.plan.nombre || r.plan.valor || '',
      precioPlan: r.plan.precioUsd || 0,
      adicionales: productosText(r),
      subPlan: r.totales.subtotalPlanUsd || 0,
      subAdd: r.totales.subtotalAdicionalesUsd || 0,
      total: r.totales.totalEstimadoUsd || 0,
      fecha: d ?? null,
    });
  }

  // Body styling (zebra + borders + formats)
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const isEven = rowNumber % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { color: { argb: 'FFF9FAFB' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1F2937' } },
        left: { style: 'thin', color: { argb: 'FF1F2937' } },
        bottom: { style: 'thin', color: { argb: 'FF1F2937' } },
        right: { style: 'thin', color: { argb: 'FF1F2937' } },
      };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FF0F172A' : 'FF0B1220' }, // dark zebra w/ high contrast text
      };

      // right-align numeric columns
      if ([6, 8, 9, 10].includes(colNumber)) {
        cell.alignment = { vertical: 'top', horizontal: 'right' };
        cell.numFmt = '#,##0.00';
      }

      // date column
      if (colNumber === 11) {
        cell.alignment = { vertical: 'top', horizontal: 'left' };
        cell.numFmt = 'dd/mm/yyyy hh:mm';
      }
    });
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columnCount },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

