import type { CotizacionDoc, PanelRole } from '../types/cotizacion';
import { formatDate, formatUsd } from '../utils/formatters';

type Props = {
  rows: CotizacionDoc[];
  role: PanelRole;
  busyId: string | null;
  onCopyEmail: (email: string) => void;
  onDetails: (row: CotizacionDoc) => void;
  onDelete: (row: CotizacionDoc) => void;
};

function productosResumen(row: CotizacionDoc): string {
  const list = row.productosAdicionales ?? [];
  if (!list.length) return '—';
  return list.map((p) => p.nombre).join(', ');
}

export function CotizacionesTable({
  rows,
  role,
  busyId,
  onCopyEmail,
  onDetails,
  onDelete,
}: Props) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 px-6 py-16 text-center text-sm text-neutral-500">
        No hay registros que coincidan con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950/80 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Adicionales</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/80">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-neutral-800/30">
                <td
                  className="max-w-[100px] truncate px-4 py-3 font-mono text-xs text-neutral-500"
                  title={row.id}
                >
                  {row.id}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-neutral-200">
                  {row.cliente.empresa || '—'}
                </td>
                <td className="max-w-[120px] truncate px-4 py-3 text-neutral-200">
                  {row.cliente.nombre || '—'}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-neutral-300">
                  {row.cliente.email || '—'}
                </td>
                <td className="max-w-[160px] px-4 py-3">
                  <div className="truncate font-medium text-neutral-100">
                    {row.plan.nombre || row.plan.valor || '—'}
                  </div>
                  <div className="text-xs text-neutral-500">{formatUsd(row.plan.precioUsd)}</div>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-neutral-400" title={productosResumen(row)}>
                  {productosResumen(row)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-neutral-100">
                  {formatUsd(row.totales.totalEstimadoUsd)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                  {formatDate(row.creadoEn)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onDetails(row)}
                      className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800"
                    >
                      Ver detalles
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopyEmail(row.cliente.email)}
                      disabled={!row.cliente.email}
                      className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800 disabled:opacity-40"
                    >
                      Copiar email
                    </button>
                    {role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        disabled={busyId === row.id}
                        className="rounded-lg border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-950/70 disabled:opacity-50"
                      >
                        {busyId === row.id ? '…' : 'Eliminar'}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
