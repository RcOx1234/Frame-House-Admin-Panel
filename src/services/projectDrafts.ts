import type { Project } from '../types/project';

export const PROJECT_DRAFTS_STORAGE_KEY = 'fh_project_drafts_v1';

export type ProjectDraft = {
  id: string;
  mode: 'create' | 'edit';
  idDoc?: string;
  project: Project;
  tagsText: string;
  updatedAt: number;
};

function readAll(): ProjectDraft[] {
  try {
    const raw = localStorage.getItem(PROJECT_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProjectDraft);
  } catch {
    return [];
  }
}

function writeAll(drafts: ProjectDraft[]): void {
  localStorage.setItem(PROJECT_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function isProjectDraft(x: unknown): x is ProjectDraft {
  if (!x || typeof x !== 'object') return false;
  const d = x as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    (d.mode === 'create' || d.mode === 'edit') &&
    typeof d.project === 'object' &&
    d.project !== null &&
    typeof d.tagsText === 'string' &&
    typeof d.updatedAt === 'number' &&
    (d.idDoc === undefined || typeof d.idDoc === 'string')
  );
}

export function listProjectDrafts(): ProjectDraft[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProjectDraft(id: string): ProjectDraft | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function upsertProjectDraft(draft: ProjectDraft): void {
  const all = readAll();
  const idx = all.findIndex((d) => d.id === draft.id);
  if (idx >= 0) all[idx] = draft;
  else all.push(draft);
  writeAll(all);
}

export function removeProjectDraft(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
}

export function createDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
