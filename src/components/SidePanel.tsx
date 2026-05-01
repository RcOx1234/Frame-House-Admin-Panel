import { useEffect } from 'react';
import type { PanelRole } from '../types/cotizacion';

type Props = {
  open: boolean;
  role: PanelRole;
  viewMode: 'list' | 'grid';
  focused: boolean;
  onClose: () => void;
  onToggleView: () => void;
  onToggleFocused: () => void;
  onRefresh: () => void;
};

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">{children}</h3>;
}

export function SidePanel({
  open,
  role,
  viewMode,
  focused,
  onClose,
  onToggleView,
  onToggleFocused,
  onRefresh,
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
            <SectionTitle>Vista</SectionTitle>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleView}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                Cambiar a {viewMode === 'list' ? 'cuadrícula' : 'lista'}
              </button>
              <button
                type="button"
                onClick={onToggleFocused}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                {focused ? 'Salir de modo registros' : 'Modo solo registros'}
              </button>
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
                Vista base (sin backend). Para control real, conviene registrar sesiones en Firestore.
              </p>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-200">Invitado</p>
                    <p className="mt-0.5 text-xs text-neutral-500">Inicio: — · Dispositivo: — · Ubicación: —</p>
                  </div>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-400">
                    Activo
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-sm font-medium text-neutral-400 opacity-60"
                    title="Requiere backend / Firestore"
                  >
                    Cerrar sesión
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-sm font-medium text-neutral-400 opacity-60"
                    title="Requiere backend / Firestore"
                  >
                    Bloquear
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-sm font-medium text-neutral-400 opacity-60"
                    title="Requiere backend / Firestore"
                  >
                    Revocar acceso
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

