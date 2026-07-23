import { useEffect, useMemo, useRef, useState } from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import type { FilterType, Project, ProjectType } from '../types/project';
import { generateProjectId } from '../utils/projectsId';
import { MediaAssetInput } from './MediaAssetInput';
import type { IntegrationDoc, PanelGeneralSettings } from '../types/settings';
import { isValidHttpUrl } from '../services/mediaUpload';
import { ProjectMediaEditor } from './ProjectMediaEditor';
import { isLegacyProjectMedia, migrateLegacyProjectMedia } from '../utils/projectMedia';
import { createDraftId, removeProjectDraft, upsertProjectDraft } from '../services/projectDrafts';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  projects: Project[];
  initialProject: Project | null;
  draftId?: string | null;
  initialTagsText?: string | null;
  general: PanelGeneralSettings;
  integrations: IntegrationDoc[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void | Promise<void>;
  onDraftsChanged?: () => void;
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
    previewImage: '',
    previewVideo: '',
    mediaItems: [],
    featuredMediaId: undefined,
    featuredMediaIndex: undefined,
    duration: '',
    platform: '',
    description: '',
    tags: [],
    format: '',
    siteUrl: '',
    featured: false,
    visible: true,
    webSeparatePreview: false,
    instagramUrl: '',
    facebookUrl: '',
  };
}

function normalizeProjectForForm(project: Project): Project {
  return {
    ...project,
    previewImage: project.previewImage || '',
    visible: project.visible !== false,
    webSeparatePreview: Boolean(project.webSeparatePreview),
    mediaItems:
      project.type === 'fotografia'
        ? (project.mediaItems || []).map((m) => ({ ...m, kind: 'image' as const }))
        : project.mediaItems || [],
    featuredMediaId: project.featuredMediaId,
    featuredMediaIndex: project.featuredMediaIndex,
    instagramUrl: project.instagramUrl || '',
    facebookUrl: project.facebookUrl || '',
  };
}

function snapshotKey(project: Project, tagsText: string): string {
  return JSON.stringify({ project, tagsText });
}

export function ProjectFormModal({
  open,
  mode,
  projects,
  initialProject,
  draftId = null,
  initialTagsText = null,
  general,
  integrations,
  submitting = false,
  onClose,
  onSubmit,
  onDraftsChanged,
}: Props) {
  const [model, setModel] = useState<Project>(() => defaultProject(projects));
  const [tagsText, setTagsText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const baselineRef = useRef<string>('');
  const readyForDraftsRef = useRef(false);

  useLockBodyScrollMobile(open);

  useEffect(() => {
    if (!open) {
      readyForDraftsRef.current = false;
      return;
    }
    setSubmitError(null);
    readyForDraftsRef.current = false;
    draftIdRef.current = draftId;

    let next: Project;
    let nextTags: string;
    if (initialProject) {
      next = normalizeProjectForForm(initialProject);
      nextTags = initialTagsText ?? initialProject.tags.join(', ');
    } else {
      next = defaultProject(projects);
      nextTags = '';
    }
    setModel(next);
    setTagsText(nextTags);
    baselineRef.current = snapshotKey(next, nextTags);
    // Permitir autoguardado tras el primer paint del estado inicial.
    window.setTimeout(() => {
      readyForDraftsRef.current = true;
    }, 0);
  }, [open, mode, initialProject, projects, draftId, initialTagsText]);

  useEffect(() => {
    if (!open || !readyForDraftsRef.current) return;
    const key = snapshotKey(model, tagsText);
    if (key === baselineRef.current) return;

    if (!draftIdRef.current) {
      draftIdRef.current = createDraftId();
    }

    const idDoc =
      mode === 'edit' ? model.idDoc || initialProject?.idDoc || undefined : undefined;

    upsertProjectDraft({
      id: draftIdRef.current,
      mode,
      idDoc,
      project: { ...model, idDoc },
      tagsText,
      updatedAt: Date.now(),
    });
    onDraftsChanged?.();
  }, [open, model, tagsText, mode, initialProject?.idDoc, onDraftsChanged]);

  const title = useMemo(() => (mode === 'create' ? 'Nuevo proyecto' : 'Editar proyecto'), [mode]);
  const legacyMedia = useMemo(() => isLegacyProjectMedia(model), [model]);

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
      mediaItems:
        type === 'fotografia'
          ? (prev.mediaItems ?? []).map((m) => ({ ...m, kind: 'image' as const }))
          : prev.mediaItems,
      // Redes del proyecto se conservan al cambiar el tipo.
      instagramUrl: prev.instagramUrl,
      facebookUrl: prev.facebookUrl,
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
    if (legacyMedia) {
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
    }

    const cleanedMediaItems = (model.mediaItems ?? [])
      .map((x) => ({
        ...x,
        kind: model.type === 'fotografia' ? ('image' as const) : x.kind,
        url: x.url?.trim() || '',
        label: x.label?.trim() || undefined,
      }))
      .filter((x) => Boolean(x.url));

    if (cleanedMediaItems.some((x) => !isValidHttpUrl(x.url))) {
      setSubmitError('Hay elementos en galería con URL no válida (https).');
      return;
    }
    if (
      model.type !== 'fotografia' &&
      cleanedMediaItems.some((x) => x.kind === 'video' && !/\.(mp4|webm|ogg|mov)(\?|$)/i.test(x.url))
    ) {
      setSubmitError('Los videos de galería deben ser URLs directas (mp4/webm/ogg/mov).');
      return;
    }
    if (model.type === 'fotografia' && cleanedMediaItems.some((x) => x.kind === 'video')) {
      setSubmitError('En fotografía la galería solo admite imágenes.');
      return;
    }

    const featuredId = model.featuredMediaId?.trim() || '';
    if (featuredId && !cleanedMediaItems.some((x) => x.id === featuredId)) {
      setSubmitError('El elemento inicial seleccionado ya no existe en la galería.');
      return;
    }

    const instagramUrl = model.instagramUrl?.trim() || '';
    const facebookUrl = model.facebookUrl?.trim() || '';
    if (instagramUrl && !isValidHttpUrl(instagramUrl)) {
      setSubmitError('El perfil de Instagram debe ser una URL HTTP/HTTPS válida.');
      return;
    }
    if (facebookUrl && !isValidHttpUrl(facebookUrl)) {
      setSubmitError('La página de Facebook debe ser una URL HTTP/HTTPS válida.');
      return;
    }

    const payload: Project = {
      ...model,
      mediaItems: cleanedMediaItems.length ? cleanedMediaItems : undefined,
      featuredMediaId: featuredId || undefined,
      featuredMediaIndex: featuredId ? cleanedMediaItems.findIndex((x) => x.id === featuredId) : undefined,
      tags: tagsText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      instagramUrl,
      facebookUrl,
    };

    if (mode === 'create' || !legacyMedia) {
      payload.previewVideo = '';
      if (payload.type === 'web') {
        payload.webSeparatePreview = false;
        payload.previewImage = '';
      } else {
        delete payload.previewImage;
        delete payload.webSeparatePreview;
      }
    } else {
      if (payload.type !== 'web') {
        delete payload.previewImage;
        delete payload.webSeparatePreview;
      } else if (!payload.webSeparatePreview) {
        payload.previewImage = '';
      }
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      console.error(err);
      setSubmitError(
        'No se pudo guardar el proyecto. Revisa tu conexión o permisos e inténtalo nuevamente.'
      );
      return;
    }

    if (draftIdRef.current) {
      removeProjectDraft(draftIdRef.current);
      draftIdRef.current = null;
      onDraftsChanged?.();
    }
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

          {mode === 'edit' && legacyMedia ? (
            <div className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-xs text-neutral-200 dark:text-neutral-300">
              <p>
                Este proyecto usa el formato antiguo (vídeo preview o imagen grande web aparte). Puedes pasarlo a{' '}
                <strong className="font-medium text-amber-200/90">miniatura + galería</strong>: se copian esos medios al
                carrusel y se limpian los campos viejos. Si la galería queda vacía, el detalle sigue usando la miniatura
                como antes.
              </p>
              <button
                type="button"
                onClick={() => setModel((m) => migrateLegacyProjectMedia(m))}
                className="mt-2 rounded-lg border border-amber-500/40 bg-amber-600/90 px-3 py-1.5 text-xs font-semibold text-neutral-950 transition hover:bg-amber-500"
              >
                Actualizar a formato nuevo
              </button>
            </div>
          ) : null}

          <ProjectMediaEditor
            projectType={model.type}
            value={model.mediaItems || []}
            featuredMediaId={model.featuredMediaId}
            onChange={(next) => update('mediaItems', next)}
            onChangeFeatured={(id) => update('featuredMediaId', id)}
            integrations={integrations}
            general={general}
          />

          {model.type === 'web' ? (
            <input
              value={model.siteUrl || ''}
              onChange={(e) => update('siteUrl', e.target.value)}
              placeholder="URL del sitio"
              className="panel-input w-full"
            />
          ) : null}

          {model.type === 'video' ? (
            <input
              value={model.duration || ''}
              onChange={(e) => update('duration', e.target.value)}
              placeholder="Duración (00:45)"
              className="panel-input w-full sm:max-w-xs"
            />
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

          <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Redes del proyecto</p>
            <input
              value={model.instagramUrl || ''}
              onChange={(e) => update('instagramUrl', e.target.value)}
              placeholder="Perfil de Instagram"
              className="panel-input w-full"
            />
            <input
              value={model.facebookUrl || ''}
              onChange={(e) => update('facebookUrl', e.target.value)}
              placeholder="Página de Facebook"
              className="panel-input w-full"
            />
          </div>

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
              Publicado en la web
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
