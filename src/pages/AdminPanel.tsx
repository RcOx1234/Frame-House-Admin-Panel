import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CotizacionDoc, PanelRole, PlanFilterValue, SortOrder } from '../types/cotizacion';
import { deleteCotizacion, fetchCotizaciones } from '../services/cotizaciones';
import { matchesSearch } from '../utils/search';
import { matchesPlanFilter } from '../utils/planFilter';
import { dateFromFirestore } from '../utils/formatters';
import { downloadCsv, exportCotizacionesToCsv } from '../utils/exportCsv';
import { StatsCard } from '../components/StatsCard';
import { CotizacionesTable } from '../components/CotizacionesTable';
import { DetailsModal } from '../components/DetailsModal';
type Props = {
  role: PanelRole;
  onLogout: () => void;
};

const PLAN_OPTIONS: { value: PlanFilterValue; label: string }[] = [
  { value: 'todos', label: 'Todos los planes' },
  { value: 'impulso', label: 'Impulso' },
  { value: 'crecimiento', label: 'Crecimiento' },
  { value: 'dominio', label: 'Dominio' },
];

export function AdminPanel({ role, onLogout }: Props) {
  const [rows, setRows] = useState<CotizacionDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilterValue>('todos');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<CotizacionDoc | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCotizaciones();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cotizaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows.filter((r) => matchesPlanFilter(r, planFilter));
    list = list.filter((r) => matchesSearch(r, query));
    const dir = sortOrder === 'desc' ? -1 : 1;
    list = [...list].sort((a, b) => {
      const ta = dateFromFirestore(a.creadoEn)?.getTime() ?? 0;
      const tb = dateFromFirestore(b.creadoEn)?.getTime() ?? 0;
      return (ta - tb) * dir;
    });
    return list;
  }, [rows, planFilter, query, sortOrder]);

  const uniquePlans = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) {
      const label = r.plan.nombre || r.plan.valor || 'Sin plan';
      set.add(label);
    }
    return set.size;
  }, [filtered]);

  async function handleCopyEmail(email: string) {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopyFeedback('Correo copiado');
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('No se pudo copiar');
      window.setTimeout(() => setCopyFeedback(null), 2500);
    }
  }

  async function handleDelete(row: CotizacionDoc) {
    if (role !== 'admin') return;
    const ok = window.confirm(
      `¿Eliminar la cotización de ${row.cliente.nombre || row.cliente.email || row.id}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    try {
      await deleteCotizacion(row.id);
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el registro.');
    } finally {
      setBusyId(null);
    }
  }

  function handleExport() {
    const csv = exportCotizacionesToCsv(filtered);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`cotizaciones_frame_house_${stamp}.csv`, csv);
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-12">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-100">
              Panel de administrador de FRAME HOUSE
            </h1>
            <p className="text-sm text-neutral-500">
              Sesión:{' '}
              <span className="text-neutral-300">
                {role === 'admin' ? 'Administrador' : 'Invitado (solo lectura)'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? 'Actualizando…' : 'Actualizar lista'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!filtered.length}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-40"
            >
              Exportar a Excel
            </button>
            <button
              type="button"
              onClick={() => onLogout()}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-200"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatsCard title="Registros visibles" value={filtered.length} hint="Tras búsqueda y filtro" />
          <StatsCard title="Planes distintos" value={uniquePlans} hint="En el resultado actual" />
          <StatsCard
            title="Acceso"
            value={role === 'admin' ? 'Admin' : 'Lectura'}
            hint={role === 'admin' ? 'Puede eliminar registros' : 'Sin eliminación'}
          />
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="text-xs font-medium uppercase text-neutral-500">
                Búsqueda
              </label>
              <input
                id="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Empresa, nombre, email o plan…"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 outline-none ring-amber-500/0 focus:border-neutral-600 focus:ring-2 focus:ring-amber-500/25"
              />
            </div>
            <div className="w-full lg:w-48">
              <label htmlFor="plan" className="text-xs font-medium uppercase text-neutral-500">
                Plan
              </label>
              <select
                id="plan"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as PlanFilterValue)}
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-neutral-600 focus:ring-2 focus:ring-amber-500/25"
              >
                {PLAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full lg:w-44">
              <label htmlFor="sort" className="text-xs font-medium uppercase text-neutral-500">
                Orden
              </label>
              <select
                id="sort"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-neutral-600 focus:ring-2 focus:ring-amber-500/25"
              >
                <option value="desc">Fecha · más recientes</option>
                <option value="asc">Fecha · más antiguos</option>
              </select>
            </div>
          </div>
          {copyFeedback ? (
            <p className="mt-3 text-sm text-amber-400/90">{copyFeedback}</p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <CotizacionesTable
          rows={filtered}
          role={role}
          busyId={busyId}
          onCopyEmail={handleCopyEmail}
          onDetails={(row) => setDetailsRow(row)}
          onDelete={handleDelete}
        />

        <p className="text-center text-xs text-neutral-600">
          ID de documento disponible en la exportación CSV · Actualización manual de lista
        </p>
      </main>
      <DetailsModal open={Boolean(detailsRow)} row={detailsRow} onClose={() => setDetailsRow(null)} />
    </div>
  );
}
