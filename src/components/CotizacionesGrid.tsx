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
      <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 px-6 py-16 text-center text-sm text-neutral-500">
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
          className="group cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-left transition hover:border-neutral-700 hover:bg-neutral-900/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-200">
              {docIcon()}
            </div>
            <div className="text-xs font-mono text-neutral-600" title={row.id}>
              {row.id.slice(0, 8)}…
            </div>
          </div>

          <div className="mt-2">
            <div className="truncate text-sm font-semibold text-neutral-100">
              {row.cliente.empresa || '—'}
            </div>
            <div className="mt-0.5 truncate text-xs text-neutral-300">{row.cliente.nombre || '—'}</div>
            <div className="mt-0.5 truncate text-[11px] text-neutral-500">{row.cliente.email || '—'}</div>
          </div>

          <div className="mt-3 grid gap-1.5 rounded-lg border border-neutral-800/60 bg-neutral-950/40 p-2">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-neutral-500">Plan</span>
              <span className="truncate font-medium text-neutral-200">
                {row.plan.nombre || row.plan.valor || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-neutral-500">Total</span>
              <span className="font-semibold tabular-nums text-neutral-100">
                {formatUsd(row.totales.totalEstimadoUsd)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-neutral-500">Fecha</span>
              <span className="text-neutral-400">{formatDate(row.creadoEn)}</span>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-200 transition group-hover:border-neutral-600 group-hover:bg-neutral-800">
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

