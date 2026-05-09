import type { Timestamp } from 'firebase/firestore';

export type IntegrationProvider = 'cloudinary' | 'imagekit';

export type DefaultMediaProvider = 'cloudinary' | 'imagekit' | 'url';

export type PanelTheme = 'light' | 'dark';

/** Documento en `panel_settings/general/integrations/{integrationId}` */
export interface IntegrationDoc {
  id: string;
  provider: IntegrationProvider;
  name: string;
  active: boolean;
  isDefault: boolean;

  /** ImageKit */
  publicKey?: string;
  urlEndpoint?: string;

  /** Cloudinary */
  cloudName?: string;
  uploadPreset?: string;
  folder?: string;

  /** Indica si existe secret `IMAGEKIT_PRIVATE_KEY_<id-normalizado>` (solo escritura desde Functions) */
  hasPrivateKey?: boolean;

  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

/** Lo que el panel puede escribir (sin timestamps ni hasPrivateKey) */
export type IntegrationWritePayload = Omit<IntegrationDoc, 'id' | 'createdAt' | 'updatedAt' | 'hasPrivateKey'>;

/** Documento `panel_settings/general` */
export interface PanelGeneralSettings {
  theme: PanelTheme;
  defaultMediaProvider: DefaultMediaProvider;
  useSeparateGalleryImages: boolean;
  useVideoPreview: boolean;
  allowUrlUpload: boolean;
  lastUpdatedAt?: Timestamp | Date | null;
}

export const DEFAULT_PANEL_SETTINGS: PanelGeneralSettings = {
  theme: 'dark',
  defaultMediaProvider: 'url',
  useSeparateGalleryImages: false,
  useVideoPreview: true,
  allowUrlUpload: true,
};
