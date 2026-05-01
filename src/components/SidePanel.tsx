import { useEffect } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { PanelRole } from '../types/cotizacion';
import type { SessionDoc } from '../services/sessions';

type Props = {
  open: boolean;
  role: PanelRole;
  viewMode: 'list' | 'grid' | 'cards';
  focused: boolean;
  section: 'registros' | 'galeria' | 'sesiones';
  onClose: () => void;
  onToggleView: () => void;
  onToggleFocused: () => void;
  onRefresh: () => void;
  onOpenGallery: () => void;
  onOpenRegistros: () => void;
  onOpenSessions: () => void;
  sessions: SessionDoc[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  onRefreshSessions: () => void;
  sessionContext: { uid: string; deviceId: string; sessionId: string | null };
};

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">{children}</h3>;
}

function navChipClass(active: boolean): string {
  return [
    'inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
    active
      ? 'border-amber-500/35 bg-amber-950/40 text-amber-200'
      : 'border-neutral-700 bg-neutral-900/80 text-neutral-300 hover:bg-neutral-800',
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
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Herramientas</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Sesión:{' '}
              <span className="text-neutral-300">
                {role === 'admin' ? 'Administrador' : 'Invitado (solo lectura)'}
              </span>
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

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4">
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
                <button
                  type="button"
                  onClick={onOpenSessions}
                  className={navChipClass(section === 'sesiones')}
                >
                  <IconSessions /> Sesiones
                </button>
              ) : null}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4">
            <SectionTitle>Vista</SectionTitle>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleView}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                Cambiar a{' '}
                {section === 'registros'
                  ? viewMode === 'list'
                    ? 'cuadrícula'
                    : 'lista'
                  : viewMode === 'cards'
                    ? 'lista'
                    : 'cards'}
              </button>
              {section === 'registros' ? (
                <button
                  type="button"
                  onClick={onToggleFocused}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                >
                  {focused ? 'Salir de modo registros' : 'Modo solo registros'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                Refrescar
              </button>
            </div>
          </section>

          {role === 'admin' ? (
            <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4">
              <SectionTitle>Resumen de sesiones</SectionTitle>
              <p className="text-sm text-neutral-400">
                Tu sesión actual y las 2 sesiones más recientes.
              </p>
              <p className="text-xs text-neutral-500">Total sesiones: {sessions.length}</p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onRefreshSessions}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
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
                  if (!list.length) return <p className="text-sm text-neutral-500">Aún no hay sesiones cargadas.</p>;
                  return list.map((s, idx) => {
                    const statusLabel = s.blocked ? 'Bloqueada' : s.forceLogout ? 'Cerrada' : s.isActive ? 'Activa' : 'Inactiva';
                    const isSelf = s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId;
                    const isAdminSession = s.role === 'admin';
                    return (
                      <div key={`${s.id}-${idx}`} className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-neutral-200">
                              {s.alias || s.email || s.deviceName || s.deviceId || '—'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                              {s.deviceName || s.deviceId} · {s.country || 'N/A'} · {s.city || 'N/A'}
                            </p>
                            {isSelf ? <p className="mt-0.5 text-[11px] text-amber-300">Sesión actual</p> : null}
                          </div>
                          <span className="rounded-md border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-300">
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
                              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200"
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
                              className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-200 disabled:opacity-50"
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
                            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 disabled:opacity-50"
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
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
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

