import { useEffect } from 'react';
import type { CotizacionDoc } from '../types/cotizacion';
import { dateFromFirestore, formatUsd } from '../utils/formatters';

type Props = {
  open: boolean;
  row: CotizacionDoc | null;
  onClose: () => void;
};

function formatDateEs(value: CotizacionDoc['creadoEn']): string {
  const d = dateFromFirestore(value);
  if (!d) return '—';
  return d.toLocaleString('es-ES');
}

export function DetailsModal({ open, row, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !row) return null;

  const adicionales = row.productosAdicionales ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Detalle de cotización</h2>
            <p className="mt-1 text-xs font-mono text-neutral-500" title={row.id}>
              ID: {row.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-neutral-100"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Cliente</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="text-neutral-200">
                  <span className="text-neutral-500">Nombre:</span> {row.cliente.nombre || '—'}
                </div>
                <div className="text-neutral-200">
                  <span className="text-neutral-500">Email:</span> {row.cliente.email || '—'}
                </div>
                <div className="text-neutral-200">
                  <span className="text-neutral-500">Empresa:</span> {row.cliente.empresa || '—'}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Plan</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="text-neutral-200">
                  <span className="text-neutral-500">Nombre:</span> {row.plan.nombre || row.plan.valor || '—'}
                </div>
                <div className="text-neutral-200">
                  <span className="text-neutral-500">Precio:</span> {formatUsd(row.plan.precioUsd)}
                </div>
                <div className="text-neutral-200">
                  <span className="text-neutral-500">Etiqueta:</span> {row.plan.etiquetaLista || '—'}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:col-span-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Productos adicionales
              </h3>
              <div className="mt-3">
                {adicionales.length ? (
                  <ul className="space-y-2 text-sm">
                    {adicionales.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-4">
                        <span className="text-neutral-200">{p.nombre}</span>
                        <span className="tabular-nums text-neutral-400">{formatUsd(p.precioUsd)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-500">Ninguno</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Totales</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Subtotal plan</span>
                  <span className="tabular-nums text-neutral-200">{formatUsd(row.totales.subtotalPlanUsd)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Subtotal adicionales</span>
                  <span className="tabular-nums text-neutral-200">
                    {formatUsd(row.totales.subtotalAdicionalesUsd)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-neutral-800 pt-2">
                  <span className="text-neutral-400">Total</span>
                  <span className="tabular-nums font-semibold text-neutral-100">
                    {formatUsd(row.totales.totalEstimadoUsd)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Fecha</h3>
              <p className="mt-3 text-sm text-neutral-200">{formatDateEs(row.creadoEn)}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

