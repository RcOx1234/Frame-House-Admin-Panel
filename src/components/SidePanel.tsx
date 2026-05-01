import { useEffect } from 'react';
import type { PanelRole } from '../types/cotizacion';
import type { SessionDoc } from '../services/sessions';

type Props = {
  open: boolean;
  role: PanelRole;
  viewMode: 'list' | 'grid' | 'cards';
  focused: boolean;
  section: 'registros' | 'galeria';
  onClose: () => void;
  onToggleView: () => void;
  onToggleFocused: () => void;
  onRefresh: () => void;
  onOpenGallery: () => void;
  onOpenRegistros: () => void;
  onCreateGalleryProject: () => void;
  sessions: SessionDoc[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  onRefreshSessions: () => void;
  sessionContext: { uid: string; deviceId: string; sessionId: string | null };
};

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">{children}</h3>;
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
  onCreateGalleryProject,
  sessions,
  sessionsLoading,
  sessionsError,
  onRefreshSessions,
  sessionContext,
}: Props) {
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenRegistros}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                Registros {section === 'registros' ? '•' : ''}
              </button>
              <button
                type="button"
                onClick={onOpenGallery}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                Galería {section === 'galeria' ? '•' : ''}
              </button>
              {role === 'admin' ? (
                <button
                  type="button"
                  onClick={onCreateGalleryProject}
                  className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-200"
                >
                  Crear nuevo
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
                Cambiar a {section === 'registros' ? (viewMode === 'list' ? 'cuadrícula' : 'lista') : (viewMode === 'cards' ? 'lista' : 'cards')}
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
              <SectionTitle>Sesiones de invitados</SectionTitle>
              <p className="text-sm text-neutral-400">
                Sesiones en Firestore · Tiempo real (bloqueo/logout)
              </p>

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
                {sessions.length ? (
                  sessions.map((s) => {
                    const isSelf = s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId;
                    const isAdminSession = s.role === 'admin';
                    const statusLabel = s.blocked
                      ? 'Bloqueada'
                      : s.forceLogout
                        ? 'Cerrada'
                        : s.isActive
                          ? 'Activa'
                          : 'Inactiva';
                    return (
                      <div key={s.id} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-200">{s.email || '—'}</p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              Rol: {s.role === 'admin' ? 'Admin' : 'Guest'} · Device: {s.deviceId.slice(0, 8)}…
                            </p>
                          </div>
                          <span
                            className={[
                              'shrink-0 rounded-full border px-2.5 py-1 text-xs',
                              s.blocked
                                ? 'border-red-900/60 bg-red-950/40 text-red-300'
                                : s.forceLogout
                                  ? 'border-amber-500/30 bg-amber-950/30 text-amber-200'
                                  : !s.isActive
                                    ? 'border-neutral-700 bg-neutral-900/70 text-neutral-400'
                                  : 'border-neutral-800 bg-neutral-900 text-neutral-300',
                            ].join(' ')}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
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
                              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                            >
                              Desbloquear
                            </button>
                          ) : (
                            <>
                              {!s.forceLogout ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelf || isAdminSession) return;
                                    void (async () => {
                                      const { setSessionBlocked } = await import('../services/sessions');
                                      await setSessionBlocked(s.id, true);
                                      onRefreshSessions();
                                    })();
                                  }}
                                  disabled={isSelf || isAdminSession}
                                  title={
                                    isSelf
                                      ? 'No puedes bloquear tu propia sesión'
                                      : isAdminSession
                                        ? 'No se puede bloquear administradores'
                                        : 'Bloquear sesión'
                                  }
                                  className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/70 disabled:opacity-50"
                                >
                                  Bloquear
                                </button>
                              ) : null}
                              {s.isActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelf) return;
                                    void (async () => {
                                      const { forceLogoutSession } = await import('../services/sessions');
                                      await forceLogoutSession(s.id);
                                      onRefreshSessions();
                                    })();
                                  }}
                                  disabled={isSelf}
                                  title={isSelf ? 'No puedes cerrar tu propia sesión desde aquí' : 'Cerrar sesión remoto'}
                                  className="rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-500/40 hover:bg-amber-950/45 disabled:opacity-50"
                                >
                                  Cerrar sesión
                                </button>
                              ) : null}
                              <button
                                type="button"
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
                                disabled={isSelf}
                                title={isSelf ? 'No puedes eliminar tu propia sesión actual' : 'Eliminar sesión'}
                                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>

                        {isSelf ? (
                          <p className="mt-2 text-xs text-neutral-500">Esta es tu sesión actual (auto-bloqueo deshabilitado).</p>
                        ) : s.forceLogout ? (
                          <p className="mt-2 text-xs text-neutral-500">Sesión cerrada remotamente (puede volver a iniciar sesión).</p>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-neutral-500">Aún no hay sesiones cargadas. Usa “Refrescar sesiones”.</p>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

