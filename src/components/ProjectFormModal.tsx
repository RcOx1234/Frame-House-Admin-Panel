import { useEffect, useMemo, useState } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { FilterType, Project, ProjectType } from '../types/project';
import { generateProjectId } from '../utils/projectsId';
import { MediaAssetInput } from './MediaAssetInput';
import type { IntegrationDoc, PanelGeneralSettings } from '../types/settings';
import { isValidHttpUrl } from '../services/mediaUpload';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  projects: Project[];
  initialProject: Project | null;
  general: PanelGeneralSettings;
  integrations: IntegrationDoc[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void | Promise<void>;
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

function defaultProject(projects: Project[], prefs: PanelGeneralSettings): Project {
  return {
    id: generateProjectId('video', projects),
    title: '',
    client: '',
    type: 'video',
    category: 'Videos',
    thumbnail: '',
    previewImage: '',
    previewVideo: '',
    duration: '',
    platform: '',
    description: '',
    tags: [],
    format: '',
    siteUrl: '',
    featured: false,
    visible: true,
    webSeparatePreview: prefs.useSeparateGalleryImages,
  };
}

export function ProjectFormModal({
  open,
  mode,
  projects,
  initialProject,
  general,
  integrations,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [model, setModel] = useState<Project>(() => defaultProject(projects, general));
  const [tagsText, setTagsText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useLockBodyScrollMobile(open);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (mode === 'edit' && initialProject) {
      setModel({
        ...initialProject,
        previewImage: initialProject.previewImage || '',
        visible: initialProject.visible !== false,
        webSeparatePreview: Boolean(initialProject.webSeparatePreview),
      });
      setTagsText(initialProject.tags.join(', '));
    } else {
      const next = defaultProject(projects, general);
      setModel(next);
      setTagsText('');
    }
  }, [open, mode, initialProject, projects, general]);

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
      previewImage: type === 'web' ? prev.previewImage : '',
      webSeparatePreview: type === 'web' ? prev.webSeparatePreview : false,
    }));
  }

  async function submit() {
    setSubmitError(null);
    if (!model.title.trim() || !model.client.trim()) {
      setSubmitError('Completa título y cliente.');
      return;
    }
    if (!model.thumbnail.trim() || !isValidHttpUrl(model.thumbnail.trim())) {
      setSubmitError('La miniatura debe ser una URL válida (https).');
      return;
    }
    if (model.type === 'web' && model.webSeparatePreview) {
      const pi = model.previewImage?.trim();
      if (pi && !isValidHttpUrl(pi)) {
        setSubmitError('La imagen de preview debe ser una URL válida o estar vacía.');
        return;
      }
    }
    if (model.previewVideo?.trim() && !isValidHttpUrl(model.previewVideo.trim())) {
      setSubmitError('La URL del video no es válida.');
      return;
    }

    const payload: Project = {
      ...model,
      tags: tagsText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    };
    if (payload.type !== 'web') {
      delete payload.previewImage;
      delete payload.webSeparatePreview;
    } else if (!payload.webSeparatePreview) {
      payload.previewImage = '';
    }
    await onSubmit(payload);
  }

  return (
    <div
      className="panel-modal-overlay z-[60]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel-modal-panel flex max-h-[90vh] max-w-3xl flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <button type="button" onClick={onClose} className="panel-btn-secondary py-1.5 text-xs">
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={model.id}
              onChange={(e) => update('id', e.target.value)}
              placeholder="ID"
              className="panel-input"
              disabled={mode === 'create'}
            />
            <input
              value={model.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Título"
              className="panel-input"
            />
            <input
              value={model.client}
              onChange={(e) => update('client', e.target.value)}
              placeholder="Cliente"
              className="panel-input"
            />
            <select
              value={model.type}
              onChange={(e) => updateType(e.target.value as ProjectType)}
              className="panel-input"
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
              className="panel-input"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={model.platform}
              onChange={(e) => update('platform', e.target.value)}
              placeholder="Plataforma"
              className="panel-input"
            />
            <input
              value={model.format}
              onChange={(e) => update('format', e.target.value)}
              placeholder="Formato"
              className="panel-input"
            />
          </div>

          <MediaAssetInput
            key={`thumb-${open}-${mode}`}
            label="Miniatura (card)"
            value={model.thumbnail}
            onChange={(url) => update('thumbnail', url)}
            integrations={integrations}
            defaultProvider={general.defaultMediaProvider}
            allowUrl={general.allowUrlUpload}
            accept="image/*"
          />

          {model.type === 'web' ? (
            <>
              <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={Boolean(model.webSeparatePreview)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    update('webSeparatePreview', checked);
                    if (!checked) update('previewImage', '');
                  }}
                />
                Usar una imagen distinta para la vista grande / preview
              </label>
              {model.webSeparatePreview ? (
                <MediaAssetInput
                  key={`pv-${open}-${mode}`}
                  label="Preview / página / detalle"
                  value={model.previewImage || ''}
                  onChange={(url) => update('previewImage', url)}
                  integrations={integrations}
                  defaultProvider={general.defaultMediaProvider}
                  allowUrl={general.allowUrlUpload}
                  accept="image/*"
                />
              ) : null}
              <input
                value={model.siteUrl || ''}
                onChange={(e) => update('siteUrl', e.target.value)}
                placeholder="URL del sitio"
                className="panel-input w-full"
              />
            </>
          ) : null}

          {model.type === 'video' ? (
            <div className="space-y-3">
              <MediaAssetInput
                key={`pvvid-${open}-${mode}`}
                label="Video preview"
                value={model.previewVideo || ''}
                onChange={(url) => update('previewVideo', url)}
                integrations={integrations}
                defaultProvider={general.defaultMediaProvider}
                allowUrl={general.allowUrlUpload}
                accept="video/*,image/*"
              />
              <input
                value={model.duration || ''}
                onChange={(e) => update('duration', e.target.value)}
                placeholder="Duración (00:45)"
                className="panel-input w-full sm:max-w-xs"
              />
            </div>
          ) : null}

          <textarea
            value={model.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Descripción"
            rows={4}
            className="panel-input w-full"
          />

          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Tags separados por coma"
            className="panel-input w-full"
          />

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={Boolean(model.featured)}
                onChange={(e) => update('featured', e.target.checked)}
              />
              Destacado
            </label>
            <label className="inline-flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={model.visible !== false}
                onChange={(e) => update('visible', e.target.checked)}
              />
              Visible para invitados
            </label>
          </div>

          {submitError ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <button type="button" onClick={onClose} className="panel-btn-secondary" disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
