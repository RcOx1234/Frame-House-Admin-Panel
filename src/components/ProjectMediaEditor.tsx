import { useMemo } from 'react';
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

  function updateItem(id: string, patch: Partial<ProjectMediaItem>) {
    onChange(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function setKind(id: string, kind: ProjectMediaKind) {
    if (!allowVideo && kind === 'video') return;
    onChange(list.map((x) => (x.id === id ? { ...x, kind } : x)));
  }

  function removeItem(id: string) {
    const next = list.filter((x) => x.id !== id);
    onChange(next);
    if (featuredMediaId === id) {
      onChangeFeatured(next[0]?.id);
    }
  }

  function move(id: string, dir: -1 | 1) {
    const idx = list.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function add(kind: ProjectMediaKind) {
    if (!allowVideo && kind === 'video') return;
    const item = createEmptyProjectMediaItem(kind);
    const next = [...list, item];
    onChange(next);
    if (!featuredMediaId) onChangeFeatured(item.id);
  }

  return (
    <div className="panel-card-muted space-y-2 p-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            Galería (carrusel detalle)
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-500">
            No usa la miniatura salvo que la agregues aquí. ★ = primer slide.
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
        <div className="space-y-2">
          {list.map((item, idx) => {
            const isFeatured = featuredMediaId === item.id || (!featuredMediaId && idx === 0);
            return (
              <div
                key={item.id}
                className="group relative min-w-0 max-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white p-2 text-xs dark:border-neutral-800 dark:bg-neutral-950"
              >
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="absolute right-1.5 top-1.5 z-10 rounded border border-neutral-200 bg-white/90 px-1.5 py-0.5 text-[13px] leading-none text-neutral-700 opacity-0 transition hover:bg-white group-hover:opacity-100 dark:border-neutral-700 dark:bg-neutral-950/90 dark:text-neutral-200"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  ×
                </button>

                <div className="flex min-w-0 flex-wrap items-center gap-2 pr-7">
                  <span className="shrink-0 text-neutral-500 dark:text-neutral-500">
                    {allowVideo ? (item.kind === 'video' ? 'Vídeo' : 'Img') : 'Img'} · {idx + 1}
                  </span>
                  {allowVideo ? (
                    <select
                      value={item.kind}
                      onChange={(e) => setKind(item.id, e.target.value as ProjectMediaKind)}
                      className="panel-input max-w-[7.5rem] py-1 text-[11px]"
                      aria-label="Tipo de media"
                    >
                      <option value="image">Imagen</option>
                      <option value="video">Vídeo</option>
                    </select>
                  ) : null}
                </div>

                <div className="mt-1.5 min-w-0">
                  <MediaAssetInput
                    label="Media"
                    value={item.url}
                    onChange={(nextUrl) => updateItem(item.id, { url: nextUrl })}
                    integrations={integrations}
                    defaultProvider={general.defaultMediaProvider}
                    allowUrl={general.allowUrlUpload}
                    accept={item.kind === 'video' ? 'video/*' : 'image/*'}
                    dense
                  />
                </div>

                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  <label
                    className="flex min-w-0 flex-1 items-center gap-1"
                    title="Etiqueta opcional (accesibilidad / notas)"
                  >
                    <span className="shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden>
                      ⌗
                    </span>
                    <input
                      value={item.label || ''}
                      onChange={(e) => updateItem(item.id, { label: e.target.value })}
                      placeholder="Etiqueta"
                      className="panel-input min-w-0 max-w-full flex-1 py-1 text-[11px]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => onChangeFeatured(item.id)}
                    className={`panel-btn-secondary shrink-0 px-2 py-1 text-sm leading-none ${
                      isFeatured ? 'border-amber-500/40 bg-amber-950/30 text-amber-200' : ''
                    }`}
                    title={isFeatured ? 'Ya es el primer slide' : 'Usar como primer elemento del carrusel'}
                    aria-label={isFeatured ? 'Primer slide' : 'Marcar como primer slide'}
                    aria-pressed={isFeatured}
                  >
                    {isFeatured ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(item.id, -1)}
                    className="panel-btn-secondary shrink-0 px-2 py-1 text-[11px]"
                    disabled={idx === 0}
                    title="Mover arriba"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(item.id, 1)}
                    className="panel-btn-secondary shrink-0 px-2 py-1 text-[11px]"
                    disabled={idx === list.length - 1}
                    title="Mover abajo"
                  >
                    ↓
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
    </div>
  );
}
