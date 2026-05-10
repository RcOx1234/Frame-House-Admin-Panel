import type { Project, ProjectMediaItem, ProjectMediaKind } from '../types/project';

function isProbablyVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url.trim());
}

function makeId(prefix: string) {
  // Sin dependencias: suficiente para IDs de UI.
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyProjectMediaItem(kind: ProjectMediaKind = 'image'): ProjectMediaItem {
  return { id: makeId('pm'), kind, url: '' };
}

function dedupeByUrl(items: ProjectMediaItem[]): ProjectMediaItem[] {
  const seen = new Set<string>();
  const out: ProjectMediaItem[] = [];
  for (const it of items) {
    const u = it.url.trim();
    if (!u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push({ ...it, url: u });
  }
  return out;
}

/**
 * Devuelve la lista de carrusel.
 * - Si existe `mediaItems`, se usa tal cual (sin auto-incluir `thumbnail`).
 * - Si no existe, se arma fallback para compatibilidad con proyectos viejos.
 */
export function getProjectCarouselItems(project: Project): ProjectMediaItem[] {
  const raw = (project.mediaItems ?? []).filter(Boolean);
  if (raw.length) return dedupeByUrl(raw);

  const items: ProjectMediaItem[] = [];
  const thumb = project.thumbnail?.trim();
  const pi = project.previewImage?.trim();
  const pv = project.previewVideo?.trim();

  // Para web con preview separado, priorizamos la imagen grande.
  if (project.type === 'web' && project.webSeparatePreview && pi) {
    items.push({ id: makeId('legacy-img'), kind: 'image', url: pi, label: 'Preview' });
  }
  if (thumb) {
    items.push({ id: makeId('legacy-thumb'), kind: 'image', url: thumb, label: 'Thumbnail' });
  }
  if (project.type !== 'web' && pi) {
    // Si alguien ya guardó previewImage en otro tipo, lo respetamos como fallback.
    items.push({ id: makeId('legacy-img'), kind: 'image', url: pi, label: 'Preview' });
  }
  if (pv) {
    items.push({
      id: makeId('legacy-vid'),
      kind: isProbablyVideoUrl(pv) ? 'video' : 'video',
      url: pv,
      label: 'Video',
    });
  }
  return dedupeByUrl(items);
}

export function getFeaturedCarouselIndex(project: Project, items: ProjectMediaItem[]): number {
  if (!items.length) return 0;
  const byId = project.featuredMediaId?.trim();
  if (byId) {
    const idx = items.findIndex((x) => x.id === byId);
    if (idx >= 0) return idx;
  }
  const byIndex = typeof project.featuredMediaIndex === 'number' ? project.featuredMediaIndex : undefined;
  if (typeof byIndex === 'number' && byIndex >= 0 && byIndex < items.length) return byIndex;
  return 0;
}

export function isProjectPreviewVideoAlreadyInCarousel(project: Project, items: ProjectMediaItem[]): boolean {
  const pv = project.previewVideo?.trim();
  if (!pv) return false;
  return items.some((x) => x.kind === 'video' && x.url.trim() === pv);
}

/** Proyecto con campos antiguos (video preview / preview web separado) editables solo vía migración. */
export function isLegacyProjectMedia(project: Project): boolean {
  if (project.previewVideo?.trim()) return true;
  if (project.type === 'web' && (Boolean(project.webSeparatePreview) || Boolean(project.previewImage?.trim()))) {
    return true;
  }
  return false;
}

/**
 * Pasa preview grande web y/o video preview a `mediaItems`, limpia campos legacy y deja ★ en el primer slide.
 * En fotografía no se importa `previewVideo` como vídeo en galería.
 */
export function migrateLegacyProjectMedia(project: Project): Project {
  const existing = [...(project.mediaItems ?? [])];
  const urls = new Set(existing.map((x) => x.url.trim()).filter(Boolean));
  const toAdd: ProjectMediaItem[] = [];

  if (project.type === 'web' && project.previewImage?.trim()) {
    const u = project.previewImage.trim();
    if (!urls.has(u)) {
      toAdd.push({ id: makeId('mig'), kind: 'image', url: u, label: 'Preview (migrado)' });
      urls.add(u);
    }
  }

  if (project.type !== 'fotografia' && project.previewVideo?.trim()) {
    const u = project.previewVideo.trim();
    if (!urls.has(u)) {
      toAdd.push({ id: makeId('mig'), kind: 'video', url: u, label: 'Vídeo (migrado)' });
      urls.add(u);
    }
  }

  const merged = dedupeByUrl([...toAdd, ...existing]);
  const firstId = merged[0]?.id;

  return {
    ...project,
    mediaItems: merged.length ? merged : undefined,
    featuredMediaId: firstId,
    featuredMediaIndex: merged.length ? 0 : undefined,
    previewVideo: '',
    previewImage: '',
    webSeparatePreview: false,
  };
}

