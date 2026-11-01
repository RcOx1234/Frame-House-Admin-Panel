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
      <div className="rounded-xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center text-sm text-muted">
        No hay registros que coincidan con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/80 text-xs uppercase tracking-wide text-muted">
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
          <tbody className="divide-y divide-line/80">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-line/30">
                <td
                  className="max-w-[100px] truncate px-4 py-3 font-mono text-xs text-muted"
                  title={row.id}
                >
                  {row.id}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-ink">
                  {row.cliente.empresa || '—'}
                </td>
                <td className="max-w-[120px] truncate px-4 py-3 text-ink">
                  {row.cliente.nombre || '—'}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-ink">
                  {row.cliente.email || '—'}
                </td>
                <td className="max-w-[160px] px-4 py-3">
                  <div className="truncate font-medium text-ink">
                    {row.plan.nombre || row.plan.valor || '—'}
                  </div>
                  <div className="text-xs text-muted">{formatUsd(row.plan.precioUsd)}</div>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-muted" title={productosResumen(row)}>
                  {productosResumen(row)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-ink">
                  {formatUsd(row.totales.totalEstimadoUsd)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatDate(row.creadoEn)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onDetails(row)}
                      className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition hover:border-line hover:bg-line"
                    >
                      Ver detalles
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopyEmail(row.cliente.email)}
                      disabled={!row.cliente.email}
                      className="rounded-lg border border-line bg-line/50 px-2.5 py-1 text-xs font-medium text-ink transition hover:border-line hover:bg-line disabled:opacity-40"
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
