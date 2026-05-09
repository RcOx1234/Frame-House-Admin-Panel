export type ProjectType = 'video' | 'web' | 'social' | 'branding' | 'fotografia' | 'otros';

export type FilterType =
  | 'Todos'
  | 'Videos'
  | 'Webs'
  | 'Contenido Social'
  | 'Branding / Diseño'
  | 'Fotografía'
  | 'Otros';

export type GalleryViewMode = 'cards' | 'list';

export interface Project {
  idDoc?: string;
  id: string;
  title: string;
  client: string;
  type: ProjectType;
  category: FilterType;
  thumbnail: string;
  /** Imagen grande para detalle / vista pública cuando el proyecto web usa modo separado */
  previewImage?: string;
  previewVideo?: string;
  duration?: string;
  platform: string;
  description: string;
  tags: string[];
  format: string;
  siteUrl?: string;
  featured?: boolean;
  /** Si es false, oculto para invitados (solo admin lo ve en el panel) */
  visible?: boolean;
  /** Solo tipo web: usar miniatura distinta de la imagen de preview */
  webSeparatePreview?: boolean;
}

