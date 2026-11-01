import { useEffect } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { PanelRole } from '../types/cotizacion';
import type { SessionDoc } from '../services/sessions';

type Props = {
  open: boolean;
  role: PanelRole;
  viewMode: 'list' | 'grid' | 'cards';
  focused: boolean;
  section: 'registros' | 'galeria' | 'sesiones' | 'configuraciones';
  onClose: () => void;
  onToggleView: () => void;
  onToggleFocused: () => void;
  onRefresh: () => void;
  onOpenGallery: () => void;
  onOpenRegistros: () => void;
  onOpenSessions: () => void;
  onOpenConfig: () => void;
  sessions: SessionDoc[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  onRefreshSessions: () => void;
  sessionContext: { uid: string; deviceId: string; sessionId: string | null };
};

function SectionTitle({ children }: { children: string }) {
  return <h3 className="panel-label">{children}</h3>;
}

function navChipClass(active: boolean): string {
  return [
    'inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition duration-200',
    active
      ? 'border-brand/40 bg-brandsoft/80 text-brand dark:border-brand/35 dark:bg-brandsoft/40 dark:text-brand'
      : 'border-line bg-canvas text-muted hover:bg-canvas dark:border-line dark:bg-surface/80 dark:text-ink dark:hover:bg-line',
  ].join(' ');
}

function IconRecords() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

function IconGallery() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m8 13 3-3 5 5" />
      <path d="M8 8h.01" />
    </svg>
  );
}

function IconSessions() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16 11V7a4 4 0 1 0-8 0v4" />
      <rect x="4" y="11" width="16" height="10" rx="2" />
    </svg>
  );
}

function IconConfig() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function SidePanel({
  open,
  role,
  viewMode,
  focused,
  section,
  onClose,
  onToggleView,
  onToggleFocused,
  onRefresh,
  onOpenGallery,
  onOpenRegistros,
  onOpenSessions,
  onOpenConfig,
  sessions,
  sessionsLoading,
  sessionsError,
  onRefreshSessions,
  sessionContext,
}: Props) {
  useLockBodyScrollMobile(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface shadow-2xl dark:border-line dark:bg-canvas">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4 dark:border-line">
          <div>
            <h2 className="text-base font-semibold text-ink dark:text-ink">Herramientas</h2>
            <p className="mt-1 text-sm text-muted dark:text-muted">
              Sesión:{' '}
              <span className="text-ink dark:text-ink">
                {role === 'admin' ? 'Administrador' : 'Invitado (solo lectura)'}
              </span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="panel-btn-secondary py-1.5 text-xs">
            Cerrar
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section className="panel-card-muted space-y-3 rounded-2xl p-4">
            <SectionTitle>Secciones</SectionTitle>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenRegistros}
                className={navChipClass(section === 'registros')}
              >
                <IconRecords /> Registros
              </button>
              <button
                type="button"
                onClick={onOpenGallery}
                className={navChipClass(section === 'galeria')}
              >
                <IconGallery /> Galería
              </button>
              {role === 'admin' ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenSessions}
                    className={navChipClass(section === 'sesiones')}
                  >
                    <IconSessions /> Sesiones
                  </button>
                  <button
                    type="button"
                    onClick={onOpenConfig}
                    className={navChipClass(section === 'configuraciones')}
                  >
                    <IconConfig /> Configuraciones
                  </button>
                </>
              ) : null}
            </div>
          </section>

          <section className="panel-card-muted space-y-3 rounded-2xl p-4">
            <SectionTitle>Vista</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {section !== 'configuraciones' ? (
                <button type="button" onClick={onToggleView} className="panel-btn-secondary text-xs">
                  Cambiar a{' '}
                  {section === 'registros'
                    ? viewMode === 'list'
                      ? 'cuadrícula'
                      : 'lista'
                    : viewMode === 'cards'
                      ? 'lista'
                      : 'cards'}
                </button>
              ) : null}
              {section === 'registros' ? (
                <button type="button" onClick={onToggleFocused} className="panel-btn-secondary text-xs">
                  {focused ? 'Salir de modo registros' : 'Modo solo registros'}
                </button>
              ) : null}
              <button type="button" onClick={onRefresh} className="panel-btn-secondary text-xs">
                Refrescar
              </button>
            </div>
          </section>

          {role === 'admin' ? (
            <section className="space-y-3 rounded-2xl border border-line bg-surface/30 p-4">
              <SectionTitle>Resumen de sesiones</SectionTitle>
              <p className="text-sm text-muted">
                Tu sesión actual y las 2 sesiones más recientes.
              </p>
              <p className="text-xs text-muted">Total sesiones: {sessions.length}</p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onRefreshSessions}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-line disabled:opacity-60"
                  disabled={sessionsLoading}
                >
                  {sessionsLoading ? 'Cargando…' : 'Refrescar sesiones'}
                </button>
                {sessionsError ? <span className="text-sm text-red-300">{sessionsError}</span> : null}
              </div>

              <div className="space-y-2">
                {(() => {
                  const current = sessions.find(
                    (s) => s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId
                  );
                  const recentOthers = sessions
                    .filter((s) => !(s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId))
                    .slice(0, 2);
                  const list = [...recentOthers, current].filter(Boolean) as SessionDoc[];
                  if (!list.length) return <p className="text-sm text-muted">Aún no hay sesiones cargadas.</p>;
                  return list.map((s, idx) => {
                    const statusLabel = s.blocked ? 'Bloqueada' : s.forceLogout ? 'Cerrada' : s.isActive ? 'Activa' : 'Inactiva';
                    const isSelf = s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId;
                    const isAdminSession = s.role === 'admin';
                    return (
                      <div key={`${s.id}-${idx}`} className="rounded-lg border border-line bg-canvas/50 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-ink">
                              {s.alias || s.email || s.deviceName || s.deviceId || '—'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted">
                              {s.deviceName || s.deviceId} · {s.country || 'N/A'} · {s.city || 'N/A'}
                            </p>
                            {isSelf ? <p className="mt-0.5 text-[11px] text-brand">Sesión actual</p> : null}
                          </div>
                          <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink">
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {s.blocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                void (async () => {
                                  const { clearSessionFlags } = await import('../services/sessions');
                                  await clearSessionFlags(s.id);
                                  onRefreshSessions();
                                })();
                              }}
                              className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                            >
                              Desbloquear
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSelf || isAdminSession}
                              onClick={() => {
                                if (isSelf || isAdminSession) return;
                                void (async () => {
                                  const { setSessionBlocked } = await import('../services/sessions');
                                  await setSessionBlocked(s.id, true);
                                  onRefreshSessions();
                                })();
                              }}
                              className="rounded-md border border-red-900/60 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 disabled:opacity-50"
                            >
                              Bloquear
                            </button>
                          )}
                          {s.isActive ? (
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => {
                                if (isSelf) return;
                                void (async () => {
                                  const { forceLogoutSession } = await import('../services/sessions');
                                  await forceLogoutSession(s.id);
                                  onRefreshSessions();
                                })();
                              }}
                              className="rounded-md border border-brand/30 bg-brandsoft/30 px-2 py-1 text-[11px] text-brand disabled:opacity-50"
                            >
                              Cerrar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => {
                              if (isSelf) return;
                              const ok = window.confirm(
                                '¿Eliminar esta sesión? El usuario podrá volver a iniciar sesión y se creará nuevamente.'
                              );
                              if (!ok) return;
                              void (async () => {
                                const { deleteSession } = await import('../services/sessions');
                                await deleteSession(s.id);
                                onRefreshSessions();
                              })();
                            }}
                            className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <button
                type="button"
                onClick={onOpenSessions}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-line"
              >
                Ver más
              </button>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

