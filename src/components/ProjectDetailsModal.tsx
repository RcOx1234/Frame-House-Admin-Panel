import { useEffect, useMemo } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { Project } from '../types/project';

type Props = {
  open: boolean;
  project: Project | null;
  useVideoPreview: boolean;
  onClose: () => void;
  onCopyId: (id: string) => void;
};

function isProbablyVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url.trim());
}

export function ProjectDetailsModal({ open, project, useVideoPreview, onClose, onCopyId }: Props) {
  useLockBodyScrollMobile(open && Boolean(project));

  const heroSrc = useMemo(() => {
    if (!project) return '';
    if (project.type === 'web' && project.webSeparatePreview && project.previewImage?.trim()) {
      return project.previewImage.trim();
    }
    return project.thumbnail;
  }, [project]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !project) return null;

  const showEmbedVideo =
    useVideoPreview && project.previewVideo?.trim() && isProbablyVideoUrl(project.previewVideo.trim());

  return (
    <div
      className="panel-modal-overlay z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel-modal-panel max-w-3xl overflow-hidden shadow-2xl transition-transform duration-200 ease-out">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{project.title}</h2>
            <p className="mt-1 font-mono text-xs text-neutral-500">{project.id}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onCopyId(project.id)} className="panel-btn-secondary py-1.5 text-xs">
              Copiar ID
            </button>
            <button type="button" onClick={onClose} className="panel-btn-secondary py-1.5 text-xs">
              Cerrar
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel-card-muted overflow-hidden p-3">
              <img
                src={heroSrc}
                alt={project.title}
                className="h-52 w-full rounded-lg object-cover transition-opacity duration-300"
                loading="lazy"
              />
              {project.type === 'web' && project.webSeparatePreview && project.previewImage?.trim() ? (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">Preview grande · miniatura puede diferir en la tarjeta</p>
              ) : null}
            </div>
            <div className="panel-card-muted space-y-2 p-4 text-sm">
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Cliente:</span> {project.client}
              </p>
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Tipo:</span> {project.type}
              </p>
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Categoría:</span> {project.category}
              </p>
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Formato:</span> {project.format}
              </p>
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Plataforma:</span> {project.platform}
              </p>
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Duración:</span> {project.duration || '—'}
              </p>
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Destacado:</span> {project.featured ? 'Sí' : 'No'}
              </p>
              <p className="text-neutral-800 dark:text-neutral-200">
                <span className="text-neutral-500 dark:text-neutral-500">Visible invitados:</span>{' '}
                {project.visible === false ? 'No' : 'Sí'}
              </p>
            </div>
          </div>

          {showEmbedVideo ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-black/90 dark:border-neutral-800">
              <video
                src={project.previewVideo!.trim()}
                className="max-h-[420px] w-full"
                controls
                playsInline
                preload="metadata"
              />
            </div>
          ) : project.previewVideo?.trim() ? (
            <div className="panel-card-muted mt-4 p-4 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="text-neutral-500 dark:text-neutral-500">Preview video:</span>{' '}
              <a href={project.previewVideo.trim()} target="_blank" rel="noreferrer" className="text-amber-700 dark:text-amber-400">
                {project.previewVideo.trim()}
              </a>
            </div>
          ) : null}

          <div className="panel-card-muted mt-4 p-4 text-sm text-neutral-700 dark:text-neutral-300">
            <p className="text-neutral-500 dark:text-neutral-500">Descripción</p>
            <p className="mt-2">{project.description || '—'}</p>
          </div>

          <div className="panel-card-muted mt-4 p-4 text-sm text-neutral-700 dark:text-neutral-300">
            <p className="text-neutral-500 dark:text-neutral-500">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(project.tags ?? []).length ? (
                (project.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-700">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-neutral-500 dark:text-neutral-500">Sin tags</span>
              )}
            </div>
          </div>

          {project.siteUrl ? (
            <div className="mt-4">
              <a
                href={project.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Abrir sitio
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
