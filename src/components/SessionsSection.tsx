import { useMemo, useState } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { SessionDoc } from '../services/sessions';
import type { PanelRole } from '../types/cotizacion';

type Props = {
  role: PanelRole;
  sessions: SessionDoc[];
  loading: boolean;
  error: string | null;
  viewMode: 'cards' | 'list';
  sessionContext: { uid: string; deviceId: string; sessionId: string | null };
  onRefresh: () => void;
};

export function SessionsSection({
  role,
  sessions,
  loading,
  error,
  viewMode,
  sessionContext,
  onRefresh,
}: Props) {
  const [details, setDetails] = useState<SessionDoc | null>(null);
  useLockBodyScrollMobile(Boolean(details));
  const [editingAliasSessionId, setEditingAliasSessionId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState('');
  const [aliasSaving, setAliasSaving] = useState(false);
  const sorted = useMemo(() => [...sessions], [sessions]);

  const canManage = role === 'admin';

  async function blockSession(s: SessionDoc) {
    if (!canManage) return;
    const { setSessionBlocked } = await import('../services/sessions');
    await setSessionBlocked(s.id, true);
    onRefresh();
  }
  async function unblockSession(s: SessionDoc) {
    if (!canManage) return;
    const { clearSessionFlags } = await import('../services/sessions');
    await clearSessionFlags(s.id);
    onRefresh();
  }
  async function closeSession(s: SessionDoc) {
    if (!canManage) return;
    const { forceLogoutSession } = await import('../services/sessions');
    await forceLogoutSession(s.id);
    onRefresh();
  }
  async function removeSession(s: SessionDoc) {
    if (!canManage) return;
    if (!window.confirm('¿Eliminar esta sesión?')) return;
    const { deleteSession } = await import('../services/sessions');
    await deleteSession(s.id);
    onRefresh();
  }
  function openAliasEditor(s: SessionDoc) {
    if (!canManage) return;
    setEditingAliasSessionId(s.id);
    setAliasDraft(s.alias ?? '');
  }
  async function saveAlias(sessionId: string) {
    if (!canManage) return;
    setAliasSaving(true);
    const { updateSessionAlias } = await import('../services/sessions');
    await updateSessionAlias(sessionId, aliasDraft);
    setAliasSaving(false);
    setEditingAliasSessionId(null);
    setAliasDraft('');
    onRefresh();
  }

  const statusText = (s: SessionDoc) =>
    s.blocked ? 'Bloqueada' : s.forceLogout ? 'Cerrada' : s.isActive ? 'Activa' : 'Inactiva';
  const asDate = (value: SessionDoc['createdAt']) => (value ? value.toDate().toLocaleString() : '—');
  const sessionTitle = (s: SessionDoc) => s.alias || s.email || s.deviceName || s.deviceId || '—';
  const isEditingAlias = (sessionId: string) => editingAliasSessionId === sessionId;

  function IconPencil() {
    return (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-line bg-surface/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Sesiones</h2>
            <p className="mt-1 text-sm text-muted">Control completo de sesiones activas e historial reciente.</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            Refrescar
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>

      {loading ? (
        <div className="rounded-xl border border-line bg-surface/40 px-4 py-10 text-center text-sm text-muted">
          Cargando sesiones...
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => {
            const isSelf = s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId;
            return (
              <div key={s.id} className="rounded-xl border border-line bg-surface/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{sessionTitle(s)}</p>
                    {isSelf ? <p className="mt-0.5 text-[11px] text-brand">Sesión actual</p> : null}
                    <p className="mt-0.5 text-[11px] text-muted">{s.role === 'admin' ? 'Admin' : 'Guest'}</p>
                  </div>
                  <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink">
                    {statusText(s)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted">{s.deviceName || s.deviceId}</p>
                <p className="text-[11px] text-muted">
                  {s.country || 'N/A'} · {s.city || 'N/A'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetails(s)}
                    className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                  >
                    Ver detalles
                  </button>
                  {s.blocked ? (
                    <button
                      type="button"
                      onClick={() => void unblockSession(s)}
                      className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                    >
                      Desbloquear
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canManage || isSelf || s.role === 'admin'}
                      onClick={() => void blockSession(s)}
                      className="rounded-md border border-red-900/60 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 disabled:opacity-50"
                    >
                      Bloquear
                    </button>
                  )}
                  {s.isActive ? (
                    <button
                      type="button"
                      disabled={!canManage || isSelf}
                      onClick={() => void closeSession(s)}
                      className="rounded-md border border-brand/30 bg-brandsoft/30 px-2 py-1 text-[11px] text-brand disabled:opacity-50"
                    >
                      Cerrar sesión
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!canManage || isSelf}
                    onClick={() => void removeSession(s)}
                    className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => openAliasEditor(s)}
                    className="rounded-md border border-line bg-surface p-1.5 text-ink disabled:opacity-50"
                    title="Editar alias"
                    aria-label="Editar alias"
                  >
                    <IconPencil />
                  </button>
                </div>
                {isEditingAlias(s.id) ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      value={aliasDraft}
                      onChange={(e) => setAliasDraft(e.target.value)}
                      placeholder="Alias de sesión"
                      className="w-full rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:border-line"
                    />
                    <button
                      type="button"
                      onClick={() => void saveAlias(s.id)}
                      disabled={aliasSaving}
                      className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAliasSessionId(null);
                        setAliasDraft('');
                      }}
                      className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/80 text-xs uppercase text-muted">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Dispositivo</th>
                  <th className="px-4 py-3">País/Ciudad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/80">
                {sorted.map((s) => {
                  const isSelf = s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId;
                  return (
                    <tr key={s.id} className="hover:bg-line/30">
                      <td className="px-4 py-3 text-ink">{sessionTitle(s)}</td>
                      <td className="px-4 py-3 text-ink">{s.role === 'admin' ? 'Admin' : 'Guest'}</td>
                      <td className="px-4 py-3 text-muted">{s.deviceName || s.deviceId}</td>
                      <td className="px-4 py-3 text-muted">
                        {s.country || 'N/A'} / {s.city || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-ink">{statusText(s)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {isSelf ? <span className="self-center text-xs text-brand">Sesión actual</span> : null}
                          <button
                            type="button"
                            onClick={() => setDetails(s)}
                            className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                          >
                            Ver detalles
                          </button>
                          {s.blocked ? (
                            <button
                              type="button"
                              onClick={() => void unblockSession(s)}
                              className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                            >
                              Desbloquear
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!canManage || isSelf || s.role === 'admin'}
                              onClick={() => void blockSession(s)}
                              className="rounded-md border border-red-900/60 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 disabled:opacity-50"
                            >
                              Bloquear
                            </button>
                          )}
                          {s.isActive ? (
                            <button
                              type="button"
                              disabled={!canManage || isSelf}
                              onClick={() => void closeSession(s)}
                              className="rounded-md border border-brand/30 bg-brandsoft/30 px-2 py-1 text-[11px] text-brand disabled:opacity-50"
                            >
                              Cerrar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={!canManage || isSelf}
                            onClick={() => void removeSession(s)}
                            className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => openAliasEditor(s)}
                            className="rounded-md border border-line bg-surface p-1.5 text-ink disabled:opacity-50"
                            title="Editar alias"
                            aria-label="Editar alias"
                          >
                            <IconPencil />
                          </button>
                        </div>
                        {isEditingAlias(s.id) ? (
                          <div className="mt-2 flex justify-end gap-1.5">
                            <input
                              value={aliasDraft}
                              onChange={(e) => setAliasDraft(e.target.value)}
                              placeholder="Alias de sesión"
                              className="w-56 rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:border-line"
                            />
                            <button
                              type="button"
                              onClick={() => void saveAlias(s.id)}
                              disabled={aliasSaving}
                              className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAliasSessionId(null);
                                setAliasDraft('');
                              }}
                              className="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {details ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetails(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-canvas p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">Detalle de sesión</h3>
                <p className="mt-1 text-xs font-mono text-muted">{details.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetails(null)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-2">
              <p><span className="text-muted">Email:</span> {details.email || '—'}</p>
              <p><span className="text-muted">Alias:</span> {details.alias || '—'}</p>
              <p><span className="text-muted">UID:</span> {details.uid || '—'}</p>
              <p><span className="text-muted">Rol:</span> {details.role}</p>
              <p><span className="text-muted">deviceId:</span> {details.deviceId}</p>
              <p><span className="text-muted">Dispositivo:</span> {details.deviceName || 'N/A'}</p>
              <p><span className="text-muted">Tipo dispositivo:</span> {details.deviceType || 'N/A'}</p>
              <p><span className="text-muted">Navegador:</span> {details.browser || 'N/A'}</p>
              <p><span className="text-muted">OS:</span> {details.os || 'N/A'}</p>
              <p><span className="text-muted">País:</span> {details.country || 'N/A'}</p>
              <p><span className="text-muted">Ciudad:</span> {details.city || 'N/A'}</p>
              <p><span className="text-muted">blocked:</span> {details.blocked ? 'true' : 'false'}</p>
              <p><span className="text-muted">forceLogout:</span> {details.forceLogout ? 'true' : 'false'}</p>
              <p><span className="text-muted">Estado:</span> {statusText(details)}</p>
              <p><span className="text-muted">isActive:</span> {details.isActive ? 'true' : 'false'}</p>
              <p><span className="text-muted">createdAt:</span> {asDate(details.createdAt)}</p>
              <p><span className="text-muted">lastSeen:</span> {asDate(details.lastSeen)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

