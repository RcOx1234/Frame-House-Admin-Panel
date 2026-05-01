import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CotizacionDoc, PanelRole, PlanFilterValue, SortOrder } from '../types/cotizacion';
import { deleteCotizacion, fetchCotizaciones } from '../services/cotizaciones';
import { matchesSearch } from '../utils/search';
import { matchesPlanFilter } from '../utils/planFilter';
import { dateFromFirestore } from '../utils/formatters';
// exportExcel se carga bajo demanda para no inflar el bundle inicial
import { StatsCard } from '../components/StatsCard';
import { CotizacionesTable } from '../components/CotizacionesTable';
import { DetailsModal } from '../components/DetailsModal';
import { CotizacionesGrid } from '../components/CotizacionesGrid';
import { SidePanel } from '../components/SidePanel';
import { SessionExpiryBanner } from '../components/SessionExpiryBanner';
import { GallerySection } from '../components/GallerySection';
import { SessionsSection } from '../components/SessionsSection';
type Props = {
  role: PanelRole;
  onLogout: () => void;
  sessionExpiryWarning?: { message: string; onDismiss: () => void } | null;
  sessionContext: { uid: string; deviceId: string; sessionId: string | null };
};

const PLAN_OPTIONS: { value: PlanFilterValue; label: string }[] = [
  { value: 'todos', label: 'Todos los planes' },
  { value: 'impulso', label: 'Impulso' },
  { value: 'crecimiento', label: 'Crecimiento' },
  { value: 'dominio', label: 'Dominio' },
];

function IconButton({
  title,
  ariaLabel,
  onClick,
  disabled,
  children,
}: {
  title: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}

function IconPanelLeft() {
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
      <path d="M3 4h18" />
      <path d="M3 12h18" />
      <path d="M3 20h18" />
      <path d="M8 4v16" />
    </svg>
  );
}

function IconGrid() {
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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconList() {
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
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconRefresh() {
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
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function IconDownload() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function AdminPanel({ role, onLogout, sessionExpiryWarning, sessionContext }: Props) {
  const [rows, setRows] = useState<CotizacionDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilterValue>('todos');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<CotizacionDoc | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('fh_view_mode');
    return saved === 'grid' ? 'grid' : 'list';
  });
  const [galleryViewMode, setGalleryViewMode] = useState<'cards' | 'list'>(() => {
    const saved = localStorage.getItem('fh_gallery_view_mode');
    return saved === 'list' ? 'list' : 'cards';
  });
  const [focused, setFocused] = useState<boolean>(() => localStorage.getItem('fh_focused') === '1');
  const [sideOpen, setSideOpen] = useState(false);
  const [section, setSection] = useState<'registros' | 'galeria' | 'sesiones'>(() => {
    const saved = localStorage.getItem('fh_admin_section');
    if (saved === 'galeria') return 'galeria';
    if (saved === 'sesiones') return 'sesiones';
    return 'registros';
  });
  const [sessionsViewMode, setSessionsViewMode] = useState<'cards' | 'list'>(() => {
    const saved = localStorage.getItem('fh_sessions_view_mode');
    return saved === 'list' ? 'list' : 'cards';
  });
  const [galleryReloadSignal, setGalleryReloadSignal] = useState(0);
  const [sessions, setSessions] = useState<import('../services/sessions').SessionDoc[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

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
    const stamp = new Date().toISOString().slice(0, 10);
    void (async () => {
      const { exportCotizacionesToXlsx } = await import('../utils/exportExcel');
      await exportCotizacionesToXlsx(`cotizaciones_frame_house_${stamp}.xlsx`, filtered);
    })();
  }

  function toggleView() {
    if (section === 'registros') {
      setViewMode((v) => {
        const next = v === 'list' ? 'grid' : 'list';
        localStorage.setItem('fh_view_mode', next);
        return next;
      });
      return;
    }
    if (section === 'sesiones') {
      setSessionsViewMode((v) => {
        const next = v === 'cards' ? 'list' : 'cards';
        localStorage.setItem('fh_sessions_view_mode', next);
        return next;
      });
      return;
    }
    setGalleryViewMode((v) => {
      const next = v === 'cards' ? 'list' : 'cards';
      localStorage.setItem('fh_gallery_view_mode', next);
      return next;
    });
  }

  function toggleFocused() {
    setFocused((v) => {
      const next = !v;
      localStorage.setItem('fh_focused', next ? '1' : '0');
      return next;
    });
  }

  function openSection(next: 'registros' | 'galeria' | 'sesiones') {
    setSection(next);
    localStorage.setItem('fh_admin_section', next);
  }

  const loadSessions = useCallback(async () => {
    if (role !== 'admin') return;
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const { listSessions } = await import('../services/sessions');
      const data = await listSessions({ limit: 80 });
      setSessions(data);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : 'No se pudieron cargar las sesiones.');
    } finally {
      setSessionsLoading(false);
    }
  }, [role]);

  function reloadCurrentSection() {
    if (section === 'registros') {
      void load();
      return;
    }
    if (section === 'sesiones') {
      void loadSessions();
      return;
    }
    setGalleryReloadSignal((n) => n + 1);
  }

  useEffect(() => {
    if (role !== 'admin') return;
    void loadSessions();
  }, [loadSessions, role]);

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
            <IconButton
              onClick={() => setSideOpen(true)}
              title="Panel lateral"
              ariaLabel="Abrir panel lateral"
            >
              <IconPanelLeft />
            </IconButton>
            <IconButton
              onClick={toggleView}
              title={
                section === 'registros'
                  ? viewMode === 'list'
                    ? 'Cambiar a cuadrícula'
                    : 'Cambiar a lista'
                  : section === 'sesiones'
                    ? sessionsViewMode === 'cards'
                      ? 'Cambiar a lista'
                      : 'Cambiar a cards'
                    : galleryViewMode === 'cards'
                      ? 'Cambiar a lista'
                      : 'Cambiar a cards'
              }
              ariaLabel={
                section === 'registros'
                  ? viewMode === 'list'
                    ? 'Cambiar a cuadrícula'
                    : 'Cambiar a lista'
                  : section === 'sesiones'
                    ? sessionsViewMode === 'cards'
                      ? 'Cambiar a lista'
                      : 'Cambiar a cards'
                    : galleryViewMode === 'cards'
                      ? 'Cambiar a lista'
                      : 'Cambiar a cards'
              }
            >
              {section === 'registros'
                ? viewMode === 'list'
                  ? <IconGrid />
                  : <IconList />
                : section === 'sesiones'
                  ? sessionsViewMode === 'cards'
                    ? <IconList />
                    : <IconGrid />
                : galleryViewMode === 'cards'
                  ? <IconList />
                  : <IconGrid />}
            </IconButton>
            {section === 'registros' ? (
              <button
                type="button"
                onClick={toggleFocused}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                title={focused ? 'Salir de modo registros' : 'Modo registros'}
              >
                {focused ? 'Vista normal' : 'Modo registros'}
              </button>
            ) : null}
            <IconButton
              onClick={reloadCurrentSection}
              disabled={section === 'registros' ? loading : false}
              title={section === 'registros' && loading ? 'Actualizando…' : 'Actualizar'}
              ariaLabel="Actualizar sección"
            >
              <IconRefresh />
            </IconButton>
            {section === 'registros' ? (
              <IconButton
                onClick={handleExport}
                disabled={!filtered.length}
                title="Exportar"
                ariaLabel="Exportar registros"
              >
                <IconDownload />
              </IconButton>
            ) : null}
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
        {section === 'registros' ? (
          <>
            {sessionExpiryWarning ? (
              <SessionExpiryBanner message={sessionExpiryWarning.message} onDismiss={sessionExpiryWarning.onDismiss} />
            ) : null}

            {!focused ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <StatsCard title="Registros visibles" value={filtered.length} hint="Tras búsqueda y filtro" />
                <StatsCard title="Planes distintos" value={uniquePlans} hint="En el resultado actual" />
                <StatsCard title="Acceso" value={role === 'admin' ? 'Admin' : 'Lectura'} hint={role === 'admin' ? 'Control total' : 'Solo lectura'} />
              </div>
            ) : null}

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
                {!focused ? (
                  <>
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
                  </>
                ) : null}
              </div>
              {copyFeedback ? <p className="mt-3 text-sm text-amber-400/90">{copyFeedback}</p> : null}
            </div>

            {error ? (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {viewMode === 'list' ? (
              <CotizacionesTable
                rows={filtered}
                role={role}
                busyId={busyId}
                onCopyEmail={handleCopyEmail}
                onDetails={(row) => setDetailsRow(row)}
                onDelete={handleDelete}
              />
            ) : (
              <CotizacionesGrid
                rows={filtered}
                role={role}
                busyId={busyId}
                onDetails={(row) => setDetailsRow(row)}
                onDelete={handleDelete}
              />
            )}

            <p className="text-center text-xs text-neutral-600">
              ID de documento disponible en la exportación CSV · Actualización manual de lista
            </p>
          </>
        ) : section === 'galeria' ? (
          <GallerySection
            role={role}
            createSignal={0}
            reloadSignal={galleryReloadSignal}
            viewMode={galleryViewMode}
          />
        ) : (
          <SessionsSection
            role={role}
            sessions={sessions}
            loading={sessionsLoading}
            error={sessionsError}
            viewMode={sessionsViewMode}
            sessionContext={sessionContext}
            onRefresh={() => void loadSessions()}
          />
        )}
      </main>
      <DetailsModal
        open={Boolean(detailsRow)}
        row={detailsRow}
        role={role}
        busyId={busyId}
        onDelete={(row) => {
          void handleDelete(row);
          setDetailsRow(null);
        }}
        onClose={() => setDetailsRow(null)}
      />
      <SidePanel
        open={sideOpen}
        role={role}
        viewMode={section === 'registros' ? viewMode : section === 'sesiones' ? sessionsViewMode : galleryViewMode}
        focused={focused}
        section={section}
        onClose={() => setSideOpen(false)}
        onToggleFocused={toggleFocused}
        onToggleView={toggleView}
        onRefresh={reloadCurrentSection}
        onOpenGallery={() => {
          openSection('galeria');
          setSideOpen(false);
        }}
        onOpenSessions={() => {
          openSection('sesiones');
          setSideOpen(false);
        }}
        onOpenRegistros={() => {
          openSection('registros');
          setSideOpen(false);
        }}
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        sessionsError={sessionsError}
        onRefreshSessions={() => void loadSessions()}
        sessionContext={sessionContext}
      />
    </div>
  );
}
