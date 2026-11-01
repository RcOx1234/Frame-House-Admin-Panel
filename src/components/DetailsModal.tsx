import { useDialogFocus } from '../hooks/useDialogFocus';
import { useEffect, useState } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { CotizacionDoc } from '../types/cotizacion';
import { dateFromFirestore, formatUsd } from '../utils/formatters';
import type { PanelRole } from '../types/cotizacion';

type Props = {
  open: boolean;
  row: CotizacionDoc | null;
  role: PanelRole;
  onClose: () => void;
  onDelete: (row: CotizacionDoc) => void;
  busyId?: string | null;
};

function formatDateEs(value: CotizacionDoc['creadoEn']): string {
  const d = dateFromFirestore(value);
  if (!d) return '—';
  return d.toLocaleString('es-ES');
}

export function DetailsModal({ open, row, role, onClose, onDelete, busyId }: Props) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useLockBodyScrollMobile(open && Boolean(row));
  const dialogRef = useDialogFocus(open && Boolean(row));

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !row) return null;

  const safeRow = row;
  const adicionales = safeRow.productosAdicionales ?? [];

  async function handleCopyAll() {
    try {
      const adicionalesText = adicionales.length
        ? adicionales.map((p) => `- ${p.nombre} (${formatUsd(p.precioUsd)})`).join('\n')
        : 'Ninguno';
      const text = [
        `Empresa: ${safeRow.cliente.empresa || '—'}`,
        `Nombre: ${safeRow.cliente.nombre || '—'}`,
        `Email: ${safeRow.cliente.email || '—'}`,
        `Plan: ${safeRow.plan.nombre || safeRow.plan.valor || '—'}`,
        `Precio del plan: ${formatUsd(safeRow.plan.precioUsd)}`,
        `Productos adicionales:\n${adicionalesText}`,
        `Subtotal del plan: ${formatUsd(safeRow.totales.subtotalPlanUsd)}`,
        `Subtotal de adicionales: ${formatUsd(safeRow.totales.subtotalAdicionalesUsd)}`,
        `Total estimado: ${formatUsd(safeRow.totales.totalEstimadoUsd)}`,
        `Fecha: ${formatDateEs(safeRow.creadoEn)}`,
        `ID: ${safeRow.id}`,
      ].join('\n');
      await navigator.clipboard.writeText(text);
      setCopyFeedback('Registro copiado');
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('No se pudo copiar');
      window.setTimeout(() => setCopyFeedback(null), 2500);
    }
  }

  return (
    <div
      className="panel-modal-overlay"
      ref={dialogRef}
      tabIndex={-1}
      aria-label="Detalle de cotización"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel-modal-panel w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Detalle de cotización</h2>
            <p className="mt-1 text-xs font-mono text-muted" title={row.id}>
              ID: {row.id}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void handleCopyAll()}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:border-line hover:bg-line"
            >
              Copiar datos
            </button>
            {role === 'admin' ? (
              <button
                type="button"
                onClick={() => onDelete(safeRow)}
                disabled={busyId === safeRow.id}
                className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-950/70 disabled:opacity-50"
              >
                {busyId === safeRow.id ? '…' : 'Eliminar'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-line hover:text-ink"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {copyFeedback ? <p className="mb-4 text-sm text-brand/90">{copyFeedback}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-line bg-surface/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Cliente</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="text-ink">
                  <span className="text-muted">Nombre:</span> {row.cliente.nombre || '—'}
                </div>
                <div className="text-ink">
                  <span className="text-muted">Email:</span> {row.cliente.email || '—'}
                </div>
                <div className="text-ink">
                  <span className="text-muted">Empresa:</span> {row.cliente.empresa || '—'}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Plan</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="text-ink">
                  <span className="text-muted">Nombre:</span> {row.plan.nombre || row.plan.valor || '—'}
                </div>
                <div className="text-ink">
                  <span className="text-muted">Precio:</span> {formatUsd(row.plan.precioUsd)}
                </div>
                <div className="text-ink">
                  <span className="text-muted">Etiqueta:</span> {row.plan.etiquetaLista || '—'}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface/40 p-4 sm:col-span-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                Productos adicionales
              </h3>
              <div className="mt-3">
                {adicionales.length ? (
                  <ul className="space-y-2 text-sm">
                    {adicionales.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-4">
                        <span className="text-ink">{p.nombre}</span>
                        <span className="tabular-nums text-muted">{formatUsd(p.precioUsd)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Ninguno</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Totales</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted">Subtotal plan</span>
                  <span className="tabular-nums text-ink">{formatUsd(row.totales.subtotalPlanUsd)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted">Subtotal adicionales</span>
                  <span className="tabular-nums text-ink">
                    {formatUsd(row.totales.subtotalAdicionalesUsd)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-line pt-2">
                  <span className="text-muted">Total</span>
                  <span className="tabular-nums font-semibold text-ink">
                    {formatUsd(row.totales.totalEstimadoUsd)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface/40 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Fecha</h3>
              <p className="mt-3 text-sm text-ink">{formatDateEs(row.creadoEn)}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

