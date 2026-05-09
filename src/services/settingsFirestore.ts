import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import {
  DEFAULT_PANEL_SETTINGS,
  type IntegrationDoc,
  type IntegrationWritePayload,
  type PanelGeneralSettings,
} from '../types/settings';

const COLLECTION = 'panel_settings';
const GENERAL_ID = 'general';
const INTEGRATIONS = 'integrations';

const db = getDb();

/** Adapta documentos legacy (`type`, `alias`, `enabled`, `config`) al modelo actual */
function normalizeIntegration(id: string, raw: Record<string, unknown>): IntegrationDoc {
  const config = (raw.config as Record<string, unknown> | undefined) || {};
  if (raw.provider === 'cloudinary' || raw.provider === 'imagekit') {
    return {
      id,
      provider: raw.provider as IntegrationDoc['provider'],
      name: typeof raw.name === 'string' ? raw.name : '',
      active: typeof raw.active === 'boolean' ? raw.active : true,
      isDefault: Boolean(raw.isDefault),
      publicKey: typeof raw.publicKey === 'string' ? raw.publicKey : undefined,
      urlEndpoint: typeof raw.urlEndpoint === 'string' ? raw.urlEndpoint : undefined,
      cloudName: typeof raw.cloudName === 'string' ? raw.cloudName : undefined,
      uploadPreset: typeof raw.uploadPreset === 'string' ? raw.uploadPreset : undefined,
      folder: typeof raw.folder === 'string' ? raw.folder : undefined,
      hasPrivateKey: typeof raw.hasPrivateKey === 'boolean' ? raw.hasPrivateKey : undefined,
      createdAt: raw.createdAt as IntegrationDoc['createdAt'],
      updatedAt: raw.updatedAt as IntegrationDoc['updatedAt'],
    };
  }

  const legacyType = raw.type as string | undefined;
  const provider: IntegrationDoc['provider'] =
    legacyType === 'imagekit' ? 'imagekit' : 'cloudinary';
  const configFolder = typeof config.folder === 'string' ? config.folder : undefined;

  return {
    id,
    provider,
    name: typeof raw.alias === 'string' ? raw.alias : typeof raw.name === 'string' ? raw.name : '',
    active: typeof raw.enabled === 'boolean' ? raw.enabled : typeof raw.active === 'boolean' ? raw.active : true,
    isDefault: Boolean(raw.isDefault),
    publicKey: typeof config.publicKey === 'string' ? config.publicKey : undefined,
    urlEndpoint: typeof config.urlEndpoint === 'string' ? config.urlEndpoint : undefined,
    cloudName: typeof config.cloudName === 'string' ? config.cloudName : undefined,
    uploadPreset: typeof config.uploadPreset === 'string' ? config.uploadPreset : undefined,
    folder: configFolder,
    hasPrivateKey: typeof raw.hasPrivateKey === 'boolean' ? raw.hasPrivateKey : undefined,
    createdAt: raw.createdAt as IntegrationDoc['createdAt'],
    updatedAt: raw.updatedAt as IntegrationDoc['updatedAt'],
  };
}

export function generalSettingsRef() {
  return doc(db, COLLECTION, GENERAL_ID);
}

export function integrationsCollectionRef() {
  return collection(db, COLLECTION, GENERAL_ID, INTEGRATIONS);
}

export async function fetchGeneralSettings(): Promise<PanelGeneralSettings> {
  const snap = await getDoc(generalSettingsRef());
  if (!snap.exists()) {
    return { ...DEFAULT_PANEL_SETTINGS };
  }
  const data = snap.data() as Partial<PanelGeneralSettings>;
  return { ...DEFAULT_PANEL_SETTINGS, ...data };
}

export function subscribeGeneralSettings(
  onUpdate: (s: PanelGeneralSettings) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    generalSettingsRef(),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<PanelGeneralSettings>;
      onUpdate({ ...DEFAULT_PANEL_SETTINGS, ...data });
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function saveGeneralSettings(
  partial: Partial<PanelGeneralSettings>
): Promise<void> {
  await setDoc(
    generalSettingsRef(),
    {
      ...partial,
      lastUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function listIntegrations(): Promise<IntegrationDoc[]> {
  const snap = await getDocs(integrationsCollectionRef());
  return snap.docs.map((d) => normalizeIntegration(d.id, d.data() as Record<string, unknown>));
}

export async function upsertIntegration(
  docId: string,
  data: IntegrationWritePayload
): Promise<void> {
  const ref = doc(db, COLLECTION, GENERAL_ID, INTEGRATIONS, docId);
  const snap = await getDoc(ref);
  const payload = {
    provider: data.provider,
    name: data.name,
    active: data.active,
    isDefault: data.isDefault,
    ...(data.publicKey !== undefined ? { publicKey: data.publicKey } : {}),
    ...(data.urlEndpoint !== undefined ? { urlEndpoint: data.urlEndpoint } : {}),
    ...(data.cloudName !== undefined ? { cloudName: data.cloudName } : {}),
    ...(data.uploadPreset !== undefined ? { uploadPreset: data.uploadPreset } : {}),
    ...(data.folder !== undefined ? { folder: data.folder } : {}),
    config: deleteField(),
    alias: deleteField(),
    type: deleteField(),
    enabled: deleteField(),
    updatedAt: serverTimestamp(),
    ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
  };
  await setDoc(ref, payload, { merge: true });
}

export async function deleteIntegration(docId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, GENERAL_ID, INTEGRATIONS, docId));
}
