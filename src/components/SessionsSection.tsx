import { useMemo, useState } from 'react';
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

  const statusText = (s: SessionDoc) =>
    s.blocked ? 'Bloqueada' : s.forceLogout ? 'Cerrada' : s.isActive ? 'Activa' : 'Inactiva';
  const asDate = (value: SessionDoc['createdAt']) => (value ? value.toDate().toLocaleString() : '—');

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Sesiones</h2>
            <p className="mt-1 text-sm text-neutral-500">Control completo de sesiones activas e historial reciente.</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
          >
            Refrescar
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>

      {loading ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-10 text-center text-sm text-neutral-400">
          Cargando sesiones...
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => {
            const isSelf = s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId;
            return (
              <div key={s.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-100">{s.email || '—'}</p>
                    {isSelf ? <p className="mt-0.5 text-[11px] text-amber-300">Sesión actual</p> : null}
                    <p className="mt-0.5 text-[11px] text-neutral-500">{s.role === 'admin' ? 'Admin' : 'Guest'}</p>
                  </div>
                  <span className="rounded-md border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-300">
                    {statusText(s)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-neutral-400">{s.deviceName || s.deviceId}</p>
                <p className="text-[11px] text-neutral-500">
                  {s.country || 'N/A'} · {s.city || 'N/A'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetails(s)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200"
                  >
                    Ver detalles
                  </button>
                  {s.blocked ? (
                    <button
                      type="button"
                      onClick={() => void unblockSession(s)}
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200"
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
                      className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-200 disabled:opacity-50"
                    >
                      Cerrar sesión
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!canManage || isSelf}
                    onClick={() => void removeSession(s)}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/80 text-xs uppercase text-neutral-500">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Dispositivo</th>
                  <th className="px-4 py-3">País/Ciudad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {sorted.map((s) => {
                  const isSelf = s.uid === sessionContext.uid && s.deviceId === sessionContext.deviceId;
                  return (
                    <tr key={s.id} className="hover:bg-neutral-800/30">
                      <td className="px-4 py-3 text-neutral-100">{s.email || '—'}</td>
                      <td className="px-4 py-3 text-neutral-300">{s.role === 'admin' ? 'Admin' : 'Guest'}</td>
                      <td className="px-4 py-3 text-neutral-400">{s.deviceName || s.deviceId}</td>
                      <td className="px-4 py-3 text-neutral-400">
                        {s.country || 'N/A'} / {s.city || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-neutral-300">{statusText(s)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {isSelf ? <span className="self-center text-xs text-amber-300">Sesión actual</span> : null}
                          <button
                            type="button"
                            onClick={() => setDetails(s)}
                            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200"
                          >
                            Ver detalles
                          </button>
                          {s.blocked ? (
                            <button
                              type="button"
                              onClick={() => void unblockSession(s)}
                              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200"
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
                              className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-200 disabled:opacity-50"
                            >
                              Cerrar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={!canManage || isSelf}
                            onClick={() => void removeSession(s)}
                            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
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
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-100">Detalle de sesión</h3>
                <p className="mt-1 text-xs font-mono text-neutral-500">{details.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetails(null)}
                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
              <p><span className="text-neutral-500">Email:</span> {details.email || '—'}</p>
              <p><span className="text-neutral-500">UID:</span> {details.uid || '—'}</p>
              <p><span className="text-neutral-500">Rol:</span> {details.role}</p>
              <p><span className="text-neutral-500">deviceId:</span> {details.deviceId}</p>
              <p><span className="text-neutral-500">Dispositivo:</span> {details.deviceName || 'N/A'}</p>
              <p><span className="text-neutral-500">Navegador:</span> {details.browser || 'N/A'}</p>
              <p><span className="text-neutral-500">País:</span> {details.country || 'N/A'}</p>
              <p><span className="text-neutral-500">Ciudad:</span> {details.city || 'N/A'}</p>
              <p><span className="text-neutral-500">blocked:</span> {details.blocked ? 'true' : 'false'}</p>
              <p><span className="text-neutral-500">forceLogout:</span> {details.forceLogout ? 'true' : 'false'}</p>
              <p><span className="text-neutral-500">Estado:</span> {statusText(details)}</p>
              <p><span className="text-neutral-500">isActive:</span> {details.isActive ? 'true' : 'false'}</p>
              <p><span className="text-neutral-500">createdAt:</span> {asDate(details.createdAt)}</p>
              <p><span className="text-neutral-500">lastSeen:</span> {asDate(details.lastSeen)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

