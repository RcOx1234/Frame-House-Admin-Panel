import type { CotizacionDoc, PanelRole } from '../types/cotizacion';
import { formatDate, formatUsd } from '../utils/formatters';

type Props = {
  rows: CotizacionDoc[];
  role: PanelRole;
  busyId: string | null;
  onDetails: (row: CotizacionDoc) => void;
  onDelete: (row: CotizacionDoc) => void;
};

function docIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M8 9h2" />
    </svg>
  );
}

export function CotizacionesGrid({ rows, role, busyId, onDetails, onDelete }: Props) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center text-sm text-muted">
        No hay registros que coincidan con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.id}
          role="button"
          tabIndex={0}
          onClick={() => onDetails(row)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onDetails(row);
          }}
          className="group cursor-pointer rounded-xl border border-line bg-surface/40 p-3 text-left transition hover:border-line hover:bg-surface/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink">
              {docIcon()}
            </div>
            <div className="text-xs font-mono text-muted" title={row.id}>
              {row.id.slice(0, 8)}…
            </div>
          </div>

          <div className="mt-2">
            <div className="truncate text-sm font-semibold text-ink">
              {row.cliente.empresa || '—'}
            </div>
            <div className="mt-0.5 truncate text-xs text-ink">{row.cliente.nombre || '—'}</div>
            <div className="mt-0.5 truncate text-[11px] text-muted">{row.cliente.email || '—'}</div>
          </div>

          <div className="mt-3 grid gap-1.5 rounded-lg border border-line/60 bg-canvas/40 p-2">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted">Plan</span>
              <span className="truncate font-medium text-ink">
                {row.plan.nombre || row.plan.valor || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted">Total</span>
              <span className="font-semibold tabular-nums text-ink">
                {formatUsd(row.totales.totalEstimadoUsd)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted">Fecha</span>
              <span className="text-muted">{formatDate(row.creadoEn)}</span>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center justify-center rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition group-hover:border-line group-hover:bg-line">
                Ver detalles
              </span>
              {role === 'admin' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(row);
                  }}
                  disabled={busyId === row.id}
                  className="rounded-md border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-[11px] font-medium text-red-300 transition hover:bg-red-950/70 disabled:opacity-50"
                >
                  {busyId === row.id ? '…' : 'Eliminar'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

