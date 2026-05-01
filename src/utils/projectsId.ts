import type { Project, ProjectType } from '../types/project';

const TYPE_PREFIX: Record<ProjectType, string> = {
  video: 'VID',
  web: 'WEB',
  social: 'SOC',
  branding: 'DES',
  fotografia: 'FOT',
  otros: 'OTH',
};

export function generateProjectId(type: ProjectType, projects: Array<Pick<Project, 'id'>>): string {
  const prefix = TYPE_PREFIX[type];
  const base = `FH-${prefix}-`;
  const count = projects.filter((p) => p.id.startsWith(base)).length + 1;
  return `${base}${String(count).padStart(3, '0')}`;
}

