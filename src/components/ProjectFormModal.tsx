import { useEffect, useMemo, useState } from 'react';
import type { FilterType, Project, ProjectType } from '../types/project';
import { generateProjectId } from '../utils/projectsId';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  projects: Project[];
  initialProject: Project | null;
  onClose: () => void;
  onSubmit: (project: Project) => void;
};

const TYPE_OPTIONS: ProjectType[] = ['video', 'web', 'social', 'branding', 'fotografia', 'otros'];
const CATEGORY_OPTIONS: FilterType[] = [
  'Videos',
  'Webs',
  'Contenido Social',
  'Branding / Diseño',
  'Fotografía',
  'Otros',
];

function defaultProject(projects: Project[]): Project {
  return {
    id: generateProjectId('video', projects),
    title: '',
    client: '',
    type: 'video',
    category: 'Videos',
    thumbnail: '',
    previewVideo: '',
    duration: '',
    platform: '',
    description: '',
    tags: [],
    format: '',
    siteUrl: '',
    featured: false,
  };
}

export function ProjectFormModal({ open, mode, projects, initialProject, onClose, onSubmit }: Props) {
  const [model, setModel] = useState<Project>(() => defaultProject(projects));
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialProject) {
      setModel(initialProject);
      setTagsText(initialProject.tags.join(', '));
    } else {
      const next = defaultProject(projects);
      setModel(next);
      setTagsText('');
    }
  }, [open, mode, initialProject, projects]);

  const title = useMemo(() => (mode === 'create' ? 'Nuevo proyecto' : 'Editar proyecto'), [mode]);

  if (!open) return null;

  function update<K extends keyof Project>(key: K, value: Project[K]) {
    setModel((prev) => ({ ...prev, [key]: value }));
  }

  function updateType(type: ProjectType) {
    const categoryByType: Record<ProjectType, FilterType> = {
      video: 'Videos',
      web: 'Webs',
      social: 'Contenido Social',
      branding: 'Branding / Diseño',
      fotografia: 'Fotografía',
      otros: 'Otros',
    };
    setModel((prev) => ({
      ...prev,
      type,
      category: categoryByType[type],
      id: mode === 'create' ? generateProjectId(type, projects) : prev.id,
      previewVideo: type === 'video' ? prev.previewVideo : '',
      duration: type === 'video' ? prev.duration : '',
      siteUrl: type === 'web' ? prev.siteUrl : '',
    }));
  }

  function submit() {
    if (!model.title.trim() || !model.client.trim() || !model.thumbnail.trim()) return;
    const payload: Project = {
      ...model,
      tags: tagsText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    };
    onSubmit(payload);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-6 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={model.id}
              onChange={(e) => update('id', e.target.value)}
              placeholder="ID"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
              disabled={mode === 'create'}
            />
            <input
              value={model.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Título"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            />
            <input
              value={model.client}
              onChange={(e) => update('client', e.target.value)}
              placeholder="Cliente"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            />
            <select
              value={model.type}
              onChange={(e) => updateType(e.target.value as ProjectType)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={model.category}
              onChange={(e) => update('category', e.target.value as FilterType)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={model.thumbnail}
              onChange={(e) => update('thumbnail', e.target.value)}
              placeholder="Thumbnail URL"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            />
            <input
              value={model.platform}
              onChange={(e) => update('platform', e.target.value)}
              placeholder="Plataforma"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            />
            <input
              value={model.format}
              onChange={(e) => update('format', e.target.value)}
              placeholder="Formato"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            />
          </div>

          {model.type === 'video' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={model.previewVideo || ''}
                onChange={(e) => update('previewVideo', e.target.value)}
                placeholder="Preview video URL"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
              />
              <input
                value={model.duration || ''}
                onChange={(e) => update('duration', e.target.value)}
                placeholder="Duración (00:45)"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
              />
            </div>
          ) : null}

          {model.type === 'web' ? (
            <input
              value={model.siteUrl || ''}
              onChange={(e) => update('siteUrl', e.target.value)}
              placeholder="URL del sitio"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
            />
          ) : null}

          <textarea
            value={model.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Descripción"
            rows={4}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
          />

          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Tags separados por coma"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100"
          />

          <label className="inline-flex items-center gap-2 text-neutral-300">
            <input
              type="checkbox"
              checked={Boolean(model.featured)}
              onChange={(e) => update('featured', e.target.checked)}
            />
            Marcar como destacado
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-neutral-950"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

