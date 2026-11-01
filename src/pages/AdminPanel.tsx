import { FileSpreadsheet } from 'lucide-react';
import { StudioNav } from '../components/StudioNav';
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
import { SessionExpiryBanner } from '../components/SessionExpiryBanner';
import { GallerySection } from '../components/GallerySection';
import { SessionsSection } from '../components/SessionsSection';
import { ConfiguracionesSection } from '../components/ConfiguracionesSection';
type Props = {
  role: PanelRole;
  onLogout: () => void;
  sessionExpiryWarning?: { secondsLeft: number; onContinue: () => void } | null;
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-canvas active:scale-[0.98] disabled:opacity-50 dark:border-line dark:bg-surface dark:text-ink dark:hover:bg-line"
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
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
  const [exporting, setExporting] = useState(false);
  const [section, setSection] = useState<'registros' | 'galeria' | 'sesiones' | 'configuraciones'>(() => {
    const saved = localStorage.getItem('fh_admin_section');
    if (saved === 'galeria') return 'galeria';
    if (saved === 'sesiones') return 'sesiones';
    if (saved === 'configuraciones') return 'configuraciones';
    return 'registros';
  });
  const [sessionsViewMode, setSessionsViewMode] = useState<'cards' | 'list'>(() => {
    const saved = localStorage.getItem('fh_sessions_view_mode');
    return saved === 'list' ? 'list' : 'cards';
  });
  const [galleryReloadSignal, setGalleryReloadSignal] = useState(0);
  const [configReloadSignal, setConfigReloadSignal] = useState(0);
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

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const { exportCotizacionesToXlsx } = await import('../utils/exportExcel');
      await exportCotizacionesToXlsx(`cotizaciones_frame_house_${stamp}.xlsx`, filtered);
    } catch {
      setError('No se pudo exportar el archivo Excel. Vuelve a intentarlo.');
    } finally {
      setExporting(false);
    }
  }

  function toggleView() {
    if (section === 'configuraciones') return;
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

  function openSection(next: 'registros' | 'galeria' | 'sesiones' | 'configuraciones') {
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
    if (section === 'configuraciones') {
      setConfigReloadSignal((n) => n + 1);
      return;
    }
    setGalleryReloadSignal((n) => n + 1);
  }

  useEffect(() => {
    if (role !== 'admin') return;
    void loadSessions();
  }, [loadSessions, role]);

  useEffect(() => {
    if (section === 'configuraciones' && role !== 'admin') {
      setSection('registros');
      localStorage.setItem('fh_admin_section', 'registros');
    }
  }, [role, section]);

  return (
    <div className="panel-shell studio-shell pb-12">
      <a className="skip-link" href="#studio-content">Ir al contenido</a>
      <StudioNav section={section} role={role} onNavigate={openSection} onLogout={() => onLogout()} />
      <header className="panel-header-bar studio-header">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-muted dark:text-ink">
              FRAME HOUSE <span className="header-divider">/</span> <span className="header-location">{section === 'registros' ? 'Registros' : section === 'galeria' ? 'Galería' : section === 'sesiones' ? 'Sesiones' : 'Configuraciones'}</span>
            </h1>
            <p className="text-sm text-muted dark:text-muted">
              Sesión:{' '}
              <span className="text-muted dark:text-ink">
                {role === 'admin' ? 'Administrador' : 'Invitado (solo lectura)'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {section !== 'configuraciones' ? (
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
            ) : null}
            {section === 'registros' ? (
              <button
                type="button"
                onClick={toggleFocused}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-line"
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
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={!filtered.length || exporting}
                title="Descargar registros filtrados en Excel (.xlsx)"
                aria-label="Exportar registros a Excel"
                aria-busy={exporting}
                className="panel-btn-secondary export-excel-button inline-flex items-center gap-2"
              >
                <FileSpreadsheet size={17} aria-hidden="true" />
                <span>{exporting ? 'Exportando…' : 'Exportar Excel'}</span>
              </button>
            ) : null}
            <button type="button" onClick={() => onLogout()} className="panel-btn-secondary text-muted dark:text-muted">
              Salir
            </button>
          </div>
        </div>
      </header>

      {sessionExpiryWarning ? (
        <div className="fixed inset-x-0 top-0 z-[200]">
          <SessionExpiryBanner
            secondsLeft={sessionExpiryWarning.secondsLeft}
            onContinue={sessionExpiryWarning.onContinue}
          />
        </div>
      ) : null}

      <main id="studio-content" className="studio-content mx-auto max-w-6xl space-y-6 px-4 pt-6">
        <div className="studio-intro" key={section}>
          <div><p className="studio-eyebrow">ADMIN STUDIO <span>/ {section === 'registros' ? '01' : section === 'galeria' ? '02' : section === 'sesiones' ? '03' : '04'}</span></p>
          <h2>{section === 'registros' ? 'Registros' : section === 'galeria' ? 'Galería' : section === 'sesiones' ? 'Sesiones' : 'Configuraciones'}<span>.</span></h2>
          <p>{section === 'registros' ? 'Cada gran proyecto empieza con una conversación.' : section === 'galeria' ? 'El trabajo que define a Frame House.' : section === 'sesiones' ? 'Una vista clara de tus dispositivos y accesos.' : 'Tu espacio de trabajo, a tu manera.'}</p></div>
          <span className="studio-section-number" aria-hidden="true">{section === 'registros' ? '01' : section === 'galeria' ? '02' : section === 'sesiones' ? '03' : '04'}</span>
        </div>
        {section === 'registros' ? (
          <>
            {!focused ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <StatsCard title="Registros visibles" value={filtered.length} hint="Tras búsqueda y filtro" />
                <StatsCard title="Planes distintos" value={uniquePlans} hint="En el resultado actual" />
                <StatsCard title="Acceso" value={role === 'admin' ? 'Admin' : 'Lectura'} hint={role === 'admin' ? 'Control total' : 'Solo lectura'} />
              </div>
            ) : null}

            <div className="rounded-xl border border-line bg-surface/50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex-1">
                  <label htmlFor="search" className="text-xs font-medium uppercase text-muted">
                    Búsqueda
                  </label>
                  <input
                    id="search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Empresa, nombre, email o plan…"
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none ring-brand/0 focus:border-line focus:ring-2 focus:ring-brand/25"
                  />
                </div>
                {!focused ? (
                  <>
                    <div className="w-full lg:w-48">
                      <label htmlFor="plan" className="text-xs font-medium uppercase text-muted">
                        Plan
                      </label>
                      <select
                        id="plan"
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value as PlanFilterValue)}
                        className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-line focus:ring-2 focus:ring-brand/25"
                      >
                        {PLAN_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full lg:w-44">
                      <label htmlFor="sort" className="text-xs font-medium uppercase text-muted">
                        Orden
                      </label>
                      <select
                        id="sort"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                        className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-line focus:ring-2 focus:ring-brand/25"
                      >
                        <option value="desc">Fecha · más recientes</option>
                        <option value="asc">Fecha · más antiguos</option>
                      </select>
                    </div>
                  </>
                ) : null}
              </div>
              {copyFeedback ? <p className="mt-3 text-sm text-brand/90">{copyFeedback}</p> : null}
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

            <p className="text-center text-xs text-muted">
              ID de documento disponible en la exportación Excel · Actualización manual de lista
            </p>
          </>
        ) : section === 'galeria' ? (
          <GallerySection
            role={role}
            createSignal={0}
            reloadSignal={galleryReloadSignal}
            viewMode={galleryViewMode}
          />
        ) : section === 'configuraciones' ? (
          role === 'admin' ? (
            <ConfiguracionesSection reloadSignal={configReloadSignal} />
          ) : null
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

    </div>
  );
}
