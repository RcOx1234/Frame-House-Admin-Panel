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

export type ProjectMediaKind = 'image' | 'video';

export type ProjectMediaItem = {
  id: string;
  kind: ProjectMediaKind;
  url: string;
  label?: string;
};

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
  /** Lista de assets para carrusel en el detalle (no incluye thumbnail a menos que se agregue explícitamente) */
  mediaItems?: ProjectMediaItem[];
  /** Asset inicial (recomendado) */
  featuredMediaId?: string;
  /** Compatibilidad: índice del asset inicial */
  featuredMediaIndex?: number;
  duration?: string;
  platform: string;
  description: string;
  tags: string[];
  format: string;
  siteUrl?: string;
  featured?: boolean;
  /** Si es false, oculto de la web (solo admin lo ve en el panel). visible !== false = publicado. */
  visible?: boolean;
  /** Perfil de Instagram del proyecto (opcional) */
  instagramUrl?: string;
  /** Página de Facebook del proyecto (opcional) */
  facebookUrl?: string;
  /** Solo tipo web: usar miniatura distinta de la imagen de preview */
  webSeparatePreview?: boolean;
}

