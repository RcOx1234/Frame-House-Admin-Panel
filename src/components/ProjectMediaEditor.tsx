import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IntegrationDoc, PanelGeneralSettings } from '../types/settings';
import type { ProjectMediaItem, ProjectMediaKind, ProjectType } from '../types/project';
import { MediaAssetInput } from './MediaAssetInput';
import { createEmptyProjectMediaItem } from '../utils/projectMedia';

type Props = {
  projectType: ProjectType;
  value: ProjectMediaItem[];
  featuredMediaId?: string;
  onChange: (next: ProjectMediaItem[]) => void;
  onChangeFeatured: (id: string | undefined) => void;
  integrations: IntegrationDoc[];
  general: PanelGeneralSettings;
};

function itemTitle(item: ProjectMediaItem, idx: number) {
  const t = item.label?.trim();
  if (t) return t;
  return item.kind === 'video' ? `Vídeo ${idx + 1}` : `Imagen ${idx + 1}`;
}

/** Miniatura: imagen directa; vídeo en pausa intentando un fotograma (sin reproducción). */
function MediaMiniThumb({
  kind,
  url,
  className,
}: {
  kind: ProjectMediaKind;
  url: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trimmed = url.trim();

  if (!trimmed) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-200/80 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500 ${className ?? ''}`}
        aria-hidden
      >
        —
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <img
        src={trimmed}
        alt=""
        className={`object-cover ${className ?? ''}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={trimmed}
      muted
      playsInline
      preload="metadata"
      tabIndex={-1}
      className={`pointer-events-none object-cover ${className ?? ''}`}
      aria-hidden
      onLoadedMetadata={() => {
        const v = videoRef.current;
        if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
        try {
          v.currentTime = Math.min(0.08, v.duration * 0.02);
        } catch {
          /* seek puede fallar sin CORS en algunos orígenes */
        }
      }}
    />
  );
}

function MediaEditPreview({
  kind,
  url,
  displayMode,
}: {
  kind: ProjectMediaKind;
  url: string;
  displayMode?: 'cover' | 'contain';
}) {
  const trimmed = url.trim();
  if (!trimmed) {
    return (
      <div className="flex aspect-video w-full max-h-72 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-100/80 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-400">
        Añade un archivo o URL abajo para ver la vista previa.
      </div>
    );
  }
  if (kind === 'image') {
    if (displayMode === 'contain') {
      return (
        <div className="relative flex max-h-72 w-full justify-center overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <img
            src={trimmed}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-3xl brightness-75"
          />
          <img
            src={trimmed}
            alt="Vista previa"
            className="relative z-10 max-h-72 w-full object-contain"
            loading="lazy"
          />
        </div>
      );
    }
    return (
      <div className="flex max-h-72 w-full justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-900/40">
        <img src={trimmed} alt="Vista previa" className="max-h-72 w-full object-contain" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-black/90 dark:border-neutral-800">
      <video src={trimmed} controls playsInline className="max-h-72 w-full" preload="metadata">
        Tu navegador no reproduce vídeo embebido.
      </video>
    </div>
  );
}

const DRAG_THRESHOLD_PX = 10;

export function ProjectMediaEditor({
  projectType,
  value,
  featuredMediaId,
  onChange,
  onChangeFeatured,
  integrations,
  general,
}: Props) {
  const list = useMemo(() => value ?? [], [value]);
  const allowVideo = projectType !== 'fotografia';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const listRef = useRef(list);
  const onChangeRef = useRef(onChange);
  listRef.current = list;
  onChangeRef.current = onChange;

  type DragSession = {
    sourceId: string;
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
    lastOverId: string | null;
  };
  const dragSessionRef = useRef<DragSession | null>(null);

  const editingItem = editingId ? list.find((x) => x.id === editingId) : undefined;

  useEffect(() => {
    if (editingId && !editingItem) setEditingId(null);
  }, [editingId, editingItem]);

  useEffect(() => {
    if (!editingId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setEditingId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId]);

  const updateItem = useCallback(
    (id: string, patch: Partial<ProjectMediaItem>) => {
      onChange(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    },
    [list, onChange]
  );

  function setKind(id: string, kind: ProjectMediaKind) {
    if (!allowVideo && kind === 'video') return;
    onChange(
      list.map((x) => {
        if (x.id !== id) return x;
        if (kind === 'video') {
          const { displayMode: _removed, ...rest } = x;
          return { ...rest, kind };
        }
        return { ...x, kind };
      })
    );
  }

  function removeItem(id: string) {
    const next = list.filter((x) => x.id !== id);
    onChange(next);
    if (featuredMediaId === id) {
      onChangeFeatured(next[0]?.id);
    }
    if (editingId === id) setEditingId(null);
  }

  const pointerListenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      const L = pointerListenersRef.current;
      if (L) {
        window.removeEventListener('pointermove', L.move, { capture: true });
        window.removeEventListener('pointerup', L.up, { capture: true });
        window.removeEventListener('pointercancel', L.up, { capture: true });
        pointerListenersRef.current = null;
      }
      dragSessionRef.current = null;
    };
  }, []);

  function commitReorder(dragId: string, dropId: string) {
    if (dragId === dropId) return;
    const L = listRef.current;
    const from = L.findIndex((x) => x.id === dragId);
    const to = L.findIndex((x) => x.id === dropId);
    if (from < 0 || to < 0) return;
    const next = [...L];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    onChangeRef.current(next);
  }

  function resolveCardIdUnderPoint(clientX: number, clientY: number, ignoreId?: string): string | null {
    if (typeof document.elementsFromPoint !== 'function') return null;
    const stack = document.elementsFromPoint(clientX, clientY);
    if (!stack) return null;
    for (const node of stack) {
      const el = node as HTMLElement;
      const card = el.closest?.('[data-media-card]') as HTMLElement | null;
      const id = card?.dataset.mediaId;
      if (id && id !== ignoreId) return id;
    }
    return null;
  }

  /** Inicia posible arrastre (ratón + táctil); no arranca si el puntero está en zona excluida (★, Editar). */
  function onCardPointerDown(e: React.PointerEvent, itemId: string) {
    if (editingId) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-drag-exclude]')) return;

    const prev = pointerListenersRef.current;
    if (prev) {
      window.removeEventListener('pointermove', prev.move, { capture: true });
      window.removeEventListener('pointerup', prev.up, { capture: true });
      window.removeEventListener('pointercancel', prev.up, { capture: true });
      pointerListenersRef.current = null;
    }

    const threshold =
      e.pointerType === 'touch' ? Math.max(DRAG_THRESHOLD_PX + 6, 16) : DRAG_THRESHOLD_PX;

    dragSessionRef.current = {
      sourceId: itemId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      lastOverId: null,
    };

    function onMove(ev: PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || ev.pointerId !== session.pointerId) return;
      const dx = ev.clientX - session.startX;
      const dy = ev.clientY - session.startY;
      if (!session.dragging) {
        if (dx * dx + dy * dy < threshold * threshold) return;
        session.dragging = true;
        setDragActiveId(session.sourceId);
      }
      if (session.dragging) {
        ev.preventDefault();
        const over = resolveCardIdUnderPoint(ev.clientX, ev.clientY, session.sourceId);
        setDragOverId(over);
        if (over) session.lastOverId = over;
      }
    }

    function onUp(ev: PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || ev.pointerId !== session.pointerId) return;
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onUp, { capture: true });
      pointerListenersRef.current = null;

      const wasDragging = session.dragging;
      const sourceId = session.sourceId;
      const lastOver = session.lastOverId;
      dragSessionRef.current = null;
      setDragActiveId(null);
      setDragOverId(null);

      if (wasDragging && lastOver && lastOver !== sourceId) {
        commitReorder(sourceId, lastOver);
      }
    }

    pointerListenersRef.current = { move: onMove, up: onUp };
    window.addEventListener('pointermove', onMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
  }

  function add(kind: ProjectMediaKind) {
    if (!allowVideo && kind === 'video') return;
    const item = createEmptyProjectMediaItem(kind);
    const next = [...list, item];
    onChange(next);
    if (!featuredMediaId) onChangeFeatured(item.id);
    setEditingId(item.id);
  }

  return (
    <div className="panel-card-muted space-y-2 p-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            Galería (carrusel detalle)
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-500">
            Mantén pulsada la tarjeta y arrastra para ordenar (también en móvil). Sobre ★ o Editar el cursor es normal.
            ★ = primer slide.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => add('image')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-base font-semibold text-neutral-950 transition hover:bg-amber-500"
            title="Agregar imagen"
            aria-label="Agregar imagen"
          >
            +
          </button>
          {allowVideo ? (
            <button
              type="button"
              onClick={() => add('video')}
              className="panel-btn-secondary h-8 px-2 text-[11px]"
              title="Agregar video"
            >
              + Vídeo
            </button>
          ) : null}
        </div>
      </div>

      {list.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {list.map((item, idx) => {
            const isFeatured = featuredMediaId === item.id || (!featuredMediaId && idx === 0);
            const isOver = dragOverId === item.id;
            return (
              <div
                key={item.id}
                role="listitem"
                data-media-card
                data-media-id={item.id}
                onPointerDown={(e) => onCardPointerDown(e, item.id)}
                title="Mantén pulsado y arrastra para reordenar (★ y Editar no arrastran)"
                className={`group flex min-w-0 max-w-full select-none items-stretch gap-2 overflow-hidden rounded-lg border bg-white p-2 text-xs transition-[opacity,box-shadow,border-color] dark:bg-neutral-950 ${
                  dragActiveId === item.id ? 'cursor-grabbing opacity-[0.72]' : 'cursor-grab'
                } ${
                  isOver
                    ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
                  <MediaMiniThumb kind={item.kind} url={item.url} className="h-full w-full" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <p className="truncate font-medium text-neutral-800 dark:text-neutral-100" title={itemTitle(item, idx)}>
                    {itemTitle(item, idx)}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500">
                    {item.kind === 'image' && item.displayMode === 'contain'
                      ? 'Imagen · Completa'
                      : `${allowVideo ? (item.kind === 'video' ? 'Vídeo' : 'Imagen') : 'Imagen'} · ${idx + 1}`}
                  </p>
                </div>

                <div
                  data-drag-exclude
                  className="flex shrink-0 cursor-pointer flex-col items-end justify-center gap-1"
                >
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => onChangeFeatured(item.id)}
                    className={`panel-btn-secondary px-2 py-0.5 text-sm leading-none ${
                      isFeatured ? 'border-amber-500/40 bg-amber-950/30 text-amber-200' : ''
                    }`}
                    title={isFeatured ? 'Primer slide del carrusel' : 'Marcar como primer slide'}
                    aria-label={isFeatured ? 'Primer slide del carrusel' : 'Marcar como primer slide'}
                    aria-pressed={isFeatured}
                  >
                    {isFeatured ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => setEditingId(item.id)}
                    className="panel-btn-secondary px-2 py-1 text-[11px]"
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 px-3 py-4 text-center text-[11px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-500">
          Sin ítems. Pulsa <span className="font-semibold">+</span>
          {allowVideo ? ' para imagen o vídeo.' : ' para añadir imágenes.'}
        </div>
      )}

      {editingItem ? (
        <div
          className="panel-modal-overlay z-[70]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-media-edit-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingId(null);
          }}
        >
          <div
            className="panel-modal-panel flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <div className="min-w-0">
                <h2 id="project-media-edit-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Editar elemento del carrusel
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-500">
                  Vista previa grande; en vídeo puedes reproducir aquí. Los cambios se guardan al cerrar el proyecto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="panel-btn-ghost shrink-0 px-2 py-1 text-lg leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <MediaEditPreview
                kind={editingItem.kind}
                url={editingItem.url}
                displayMode={editingItem.displayMode}
              />

              <div className="space-y-2">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Título / etiqueta
                </label>
                <input
                  value={editingItem.label || ''}
                  onChange={(e) => updateItem(editingItem.id, { label: e.target.value })}
                  placeholder="Nombre que verás en la tarjeta"
                  className="panel-input w-full py-2 text-sm"
                />
              </div>

              {allowVideo ? (
                <div className="space-y-2">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Tipo
                  </span>
                  <select
                    value={editingItem.kind}
                    onChange={(e) => setKind(editingItem.id, e.target.value as ProjectMediaKind)}
                    className="panel-input w-full py-2 text-sm"
                    aria-label="Tipo de media"
                  >
                    <option value="image">Imagen</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>
              ) : null}

              {editingItem.kind === 'image' ? (
                <div className="space-y-1">
                  <label className="inline-flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={editingItem.displayMode === 'contain'}
                      onChange={(e) =>
                        updateItem(editingItem.id, {
                          displayMode: e.target.checked ? 'contain' : undefined,
                        })
                      }
                    />
                    <span>Mostrar imagen completa (sin recortar)</span>
                  </label>
                  <p className="pl-6 text-[11px] leading-snug text-neutral-500 dark:text-neutral-500">
                    Ideal para flyers, afiches y diseños verticales. El espacio sobrante se rellenará con un fondo
                    desenfocado.
                  </p>
                </div>
              ) : null}

              <MediaAssetInput
                label="Archivo o enlace"
                value={editingItem.url}
                onChange={(nextUrl) => updateItem(editingItem.id, { url: nextUrl })}
                integrations={integrations}
                defaultProvider={general.defaultMediaProvider}
                allowUrl={general.allowUrlUpload}
                accept={editingItem.kind === 'video' ? 'video/*' : 'image/*'}
                showCurrentUrlFooter={false}
              />

              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => removeItem(editingItem.id)}
                  className="rounded-lg border border-red-300/80 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                >
                  Eliminar del carrusel
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="panel-btn-secondary ml-auto text-xs">
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
