import { useEffect } from 'react';
import type { Project } from '../types/project';

type Props = {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onCopyId: (id: string) => void;
};

export function ProjectDetailsModal({ open, project, onClose, onCopyId }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">{project.title}</h2>
            <p className="mt-1 text-xs font-mono text-neutral-500">{project.id}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCopyId(project.id)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              Copiar ID
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-100"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
              <img
                src={project.thumbnail}
                alt={project.title}
                className="h-52 w-full rounded-lg object-cover"
                loading="lazy"
              />
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm">
              <p className="text-neutral-200">
                <span className="text-neutral-500">Cliente:</span> {project.client}
              </p>
              <p className="mt-2 text-neutral-200">
                <span className="text-neutral-500">Tipo:</span> {project.type}
              </p>
              <p className="mt-2 text-neutral-200">
                <span className="text-neutral-500">Categoría:</span> {project.category}
              </p>
              <p className="mt-2 text-neutral-200">
                <span className="text-neutral-500">Formato:</span> {project.format}
              </p>
              <p className="mt-2 text-neutral-200">
                <span className="text-neutral-500">Plataforma:</span> {project.platform}
              </p>
              <p className="mt-2 text-neutral-200">
                <span className="text-neutral-500">Duración:</span> {project.duration || '—'}
              </p>
              <p className="mt-2 text-neutral-200">
                <span className="text-neutral-500">Destacado:</span> {project.featured ? 'Sí' : 'No'}
              </p>
            </div>
          </div>

          {project.previewVideo ? (
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
              <span className="text-neutral-500">Preview video:</span>{' '}
              <a href={project.previewVideo} target="_blank" rel="noreferrer" className="text-amber-400">
                {project.previewVideo}
              </a>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
            <p className="text-neutral-500">Descripción</p>
            <p className="mt-2">{project.description || '—'}</p>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
            <p className="text-neutral-500">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.tags.length ? (
                project.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-neutral-500">Sin tags</span>
              )}
            </div>
          </div>

          {project.siteUrl ? (
            <div className="mt-4">
              <a
                href={project.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
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

