import { useEffect, useMemo, useState } from 'react';
import type { ProjectMediaItem } from '../types/project';

type Props = {
  items: ProjectMediaItem[];
  initialIndex?: number;
  className?: string;
  altFallback?: string;
};

function clampIndex(idx: number, len: number) {
  if (!len) return 0;
  return Math.max(0, Math.min(len - 1, idx));
}

export function ProjectMediaCarousel({ items, initialIndex = 0, className = '', altFallback = 'Media' }: Props) {
  const safeInitial = useMemo(() => clampIndex(initialIndex, items.length), [initialIndex, items.length]);
  const [active, setActive] = useState(safeInitial);

  useEffect(() => {
    setActive(safeInitial);
  }, [safeInitial]);

  const current = items[active];
  const canNav = items.length > 1;

  function prev() {
    if (!canNav) return;
    setActive((i) => (i - 1 + items.length) % items.length);
  }

  function next() {
    if (!canNav) return;
    setActive((i) => (i + 1) % items.length);
  }

  if (!items.length) return null;

  return (
    <div className={`relative ${className}`}>
      <div className="relative h-52 w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        {current.kind === 'video' ? (
          current.displayMode === 'contain' ? (
            <div className="relative h-52 w-full overflow-hidden">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(90,18,28,0.55)_0%,_transparent_58%),linear-gradient(145deg,#1a080c_0%,#050505_42%,#2a0c14_100%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_42%,_rgba(0,0,0,0.55)_100%)]"
              />
              <video
                src={current.url}
                className="relative z-10 h-52 w-full object-contain"
                controls
                playsInline
                preload="metadata"
              />
            </div>
          ) : (
            <video
              src={current.url}
              className="h-52 w-full object-cover"
              controls
              playsInline
              preload="metadata"
            />
          )
        ) : current.displayMode === 'contain' ? (
          <div className="relative h-52 w-full overflow-hidden">
            <img
              src={current.url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-3xl brightness-75"
            />
            <img
              src={current.url}
              alt={current.label || altFallback}
              className="relative z-10 h-52 w-full object-contain transition-opacity duration-300"
              loading="lazy"
            />
          </div>
        ) : (
          <img
            src={current.url}
            alt={current.label || altFallback}
            className="h-52 w-full object-cover transition-opacity duration-300"
            loading="lazy"
          />
        )}

        {canNav ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-neutral-200/60 bg-white/80 px-2 py-1 text-sm text-neutral-900 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-700/70 dark:bg-neutral-950/60 dark:text-neutral-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-neutral-200/60 bg-white/80 px-2 py-1 text-sm text-neutral-900 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-700/70 dark:bg-neutral-950/60 dark:text-neutral-100"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

