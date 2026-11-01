import { useDialogFocus } from '../hooks/useDialogFocus';
import { useEffect, useMemo } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { Project } from '../types/project';
import { ProjectMediaCarousel } from './ProjectMediaCarousel';
import { getFeaturedCarouselIndex, getProjectCarouselItems, isProjectPreviewVideoAlreadyInCarousel } from '../utils/projectMedia';

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
  const dialogRef = useDialogFocus(open && Boolean(project));

  const carouselItems = useMemo(() => (project ? getProjectCarouselItems(project) : []), [project]);
  const initialCarouselIndex = useMemo(
    () => (project ? getFeaturedCarouselIndex(project, carouselItems) : 0),
    [project, carouselItems]
  );
  const showPreviewNote = Boolean(project?.type === 'web' && project.webSeparatePreview && project.previewImage?.trim());

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
  const previewVideoAlreadyInCarousel = isProjectPreviewVideoAlreadyInCarousel(project, carouselItems);

  return (
    <div
      className="panel-modal-overlay z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={project.title} tabIndex={-1} className="panel-modal-panel max-w-3xl overflow-hidden shadow-2xl transition-transform duration-200 ease-out">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4 dark:border-line">
          <div>
            <h2 className="text-base font-semibold text-ink dark:text-ink">{project.title}</h2>
            <p className="mt-1 font-mono text-xs text-muted">{project.id}</p>
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
              <ProjectMediaCarousel items={carouselItems} initialIndex={initialCarouselIndex} altFallback={project.title} />
              {showPreviewNote ? (
                <p className="mt-2 text-xs text-muted dark:text-muted">Preview grande · miniatura puede diferir en la tarjeta</p>
              ) : null}
            </div>
            <div className="panel-card-muted space-y-2 p-4 text-sm">
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Cliente:</span> {project.client}
              </p>
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Tipo:</span> {project.type}
              </p>
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Categoría:</span> {project.category}
              </p>
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Formato:</span> {project.format}
              </p>
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Plataforma:</span> {project.platform}
              </p>
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Duración:</span> {project.duration || '—'}
              </p>
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Destacado:</span> {project.featured ? 'Sí' : 'No'}
              </p>
              <p className="text-ink dark:text-ink">
                <span className="text-muted dark:text-muted">Estado web:</span>{' '}
                {project.visible === false ? 'Oculto' : 'Publicado'}
              </p>
              {project.instagramUrl?.trim() ? (
                <p className="text-ink dark:text-ink">
                  <span className="text-muted dark:text-muted">Instagram:</span>{' '}
                  <a
                    href={project.instagramUrl.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-brand dark:text-brand"
                  >
                    {project.instagramUrl.trim()}
                  </a>
                </p>
              ) : null}
              {project.facebookUrl?.trim() ? (
                <p className="text-ink dark:text-ink">
                  <span className="text-muted dark:text-muted">Facebook:</span>{' '}
                  <a
                    href={project.facebookUrl.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-brand dark:text-brand"
                  >
                    {project.facebookUrl.trim()}
                  </a>
                </p>
              ) : null}
              {project.tiktokUrl?.trim() ? (
                <p className="text-ink dark:text-ink">
                  <span className="text-muted dark:text-muted">TikTok:</span>{' '}
                  <a
                    href={project.tiktokUrl.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-brand dark:text-brand"
                  >
                    {project.tiktokUrl.trim()}
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          {showEmbedVideo && !previewVideoAlreadyInCarousel ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-black/90 dark:border-line">
              <video
                src={project.previewVideo!.trim()}
                className="max-h-[420px] w-full"
                controls
                playsInline
                preload="metadata"
              />
            </div>
          ) : project.previewVideo?.trim() && !previewVideoAlreadyInCarousel ? (
            <div className="panel-card-muted mt-4 p-4 text-sm text-ink dark:text-ink">
              <span className="text-muted dark:text-muted">Preview video:</span>{' '}
              <a href={project.previewVideo.trim()} target="_blank" rel="noreferrer" className="text-brand dark:text-brand">
                {project.previewVideo.trim()}
              </a>
            </div>
          ) : null}

          <div className="panel-card-muted mt-4 p-4 text-sm text-ink dark:text-ink">
            <p className="text-muted dark:text-muted">Descripción</p>
            <p className="mt-2">{project.description || '—'}</p>
          </div>

          <div className="panel-card-muted mt-4 p-4 text-sm text-ink dark:text-ink">
            <p className="text-muted dark:text-muted">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(project.tags ?? []).length ? (
                (project.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border border-line px-2 py-0.5 text-xs dark:border-line">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-muted dark:text-muted">Sin tags</span>
              )}
            </div>
          </div>

          {project.siteUrl ? (
            <div className="mt-4">
              <a
                href={project.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted transition hover:bg-canvas dark:border-line dark:bg-surface dark:text-ink dark:hover:bg-line"
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
