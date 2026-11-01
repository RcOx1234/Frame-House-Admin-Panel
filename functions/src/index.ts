import * as crypto from 'crypto';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { initializeApp, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { cloudCode, IMAGEKIT_BACKEND_RELEASE, persistPrivateKey, runCloudOperation } from './cloudOperations';

const ADMIN_PANEL_EMAIL = 'admin@framehouse.com';
const INTEGRATIONS_PATH = 'panel_settings/general/integrations';
const CALLABLE_OPTIONS = { cors: true, region: 'us-central1', timeoutSeconds: 60 } as const;

function ensureAdmin(request: { auth?: { token?: Record<string, unknown> } }): void {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Inicia sesión para gestionar ImageKit.');
  if (request.auth.token?.email !== ADMIN_PANEL_EMAIL) throw new HttpsError('permission-denied', 'Solo el administrador puede gestionar ImageKit.');
}
function app() {
  if (!getApps().length) initializeApp();
  return getApps()[0]!;
}
function integrationSecretId(integrationId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(integrationId)) throw new HttpsError('invalid-argument', 'integrationId no válido');
  // Keep existing secret IDs compatible with already saved credentials.
  return `IMAGEKIT_PRIVATE_KEY_${integrationId}`.replace(/-/g, '_').toUpperCase();
}
function resolveProjectId(): string {
  const id = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || app().options.projectId;
  if (!id) throw new HttpsError('failed-precondition', 'No se pudo resolver el proyecto Firebase de ejecución.');
  return id;
}
function readIntegrationId(data: unknown): string {
  const id = typeof (data as { integrationId?: unknown })?.integrationId === 'string'
    ? (data as { integrationId: string }).integrationId.trim() : '';
  integrationSecretId(id);
  return id;
}
type IntegrationSnap = { provider?: string; active?: boolean; publicKey?: string; urlEndpoint?: string };
async function integration(integrationId: string) {
  const ref = getFirestore(app()).doc(`${INTEGRATIONS_PATH}/${integrationId}`);
  const snap = await runCloudOperation('read-integration', () => ref.get());
  if (!snap.exists) throw new HttpsError('not-found', 'Guarda primero la cuenta ImageKit en las configuraciones del panel.');
  const row = snap.data() as IntegrationSnap;
  if (row.provider !== 'imagekit') throw new HttpsError('failed-precondition', 'La integración no es ImageKit.');
  return { ref, row };
}
async function readPrivateKey(projectId: string, integrationId: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const [version] = await runCloudOperation('read-secret', () => client.accessSecretVersion({ name: `projects/${projectId}/secrets/${integrationSecretId(integrationId)}/versions/latest` }));
  const data = version.payload?.data;
  const key = (typeof data === 'string' ? data : data instanceof Uint8Array ? Buffer.from(data).toString('utf8') : '').trim();
  if (!key) throw new HttpsError('failed-precondition', 'El secreto de ImageKit está vacío. Guarda una private key válida.');
  return key;
}

/** Stable Upload V1 signature; private credentials never leave Firebase. */
export const getImageKitUploadAuth = onCall(CALLABLE_OPTIONS, async (request) => {
  ensureAdmin(request);
  const id = readIntegrationId(request.data);
  const { row } = await integration(id);
  if (row.active === false) throw new HttpsError('failed-precondition', 'La integración ImageKit está inactiva.');
  const publicKey = row.publicKey?.trim() || '';
  const urlEndpoint = row.urlEndpoint?.trim() || '';
  if (!publicKey || !urlEndpoint) throw new HttpsError('failed-precondition', 'Configura publicKey y urlEndpoint.');
  const privateKey = await readPrivateKey(resolveProjectId(), id);
  const token = crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + 30 * 60;
  const signature = crypto.createHmac('sha1', privateKey).update(token + expire).digest('hex');
  return { token, expire, signature, publicKey, urlEndpoint, backendRelease: IMAGEKIT_BACKEND_RELEASE };
});

export const setImageKitPrivateKey = onCall(CALLABLE_OPTIONS, async (request) => {
  ensureAdmin(request);
  const id = readIntegrationId(request.data);
  const privateKey = typeof request.data?.privateKey === 'string' ? request.data.privateKey.trim() : '';
  if (!privateKey.startsWith('private_') || /\s/.test(privateKey)) throw new HttpsError('invalid-argument', 'Usa la private key completa de ImageKit (private_…), sin espacios.');
  const { ref } = await integration(id);
  await persistPrivateKey(new SecretManagerServiceClient(), resolveProjectId(), integrationSecretId(id), privateKey);
  try {
    await runCloudOperation('write-integration', () => ref.set({ hasPrivateKey: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
  } catch (error) {
    if (error instanceof HttpsError) throw new HttpsError(error.code, `La clave se guardó en Secret Manager, pero no se pudo actualizar el estado del panel. ${error.message}`, error.details);
    throw error;
  }
  return { ok: true as const, backendRelease: IMAGEKIT_BACKEND_RELEASE };
});

export const deleteImageKitPrivateKey = onCall(CALLABLE_OPTIONS, async (request) => {
  ensureAdmin(request);
  const id = readIntegrationId(request.data);
  const { ref } = await integration(id);
  await runCloudOperation('delete-secret', async () => {
    try { await new SecretManagerServiceClient().deleteSecret({ name: `projects/${resolveProjectId()}/secrets/${integrationSecretId(id)}` }); }
    catch (error) { if (![5, 404, 'NOT_FOUND'].includes(cloudCode(error) ?? '')) throw error; }
  });
  await runCloudOperation('write-integration', () => ref.set({ hasPrivateKey: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
  return { ok: true as const, backendRelease: IMAGEKIT_BACKEND_RELEASE };
});

/** Real, read-only ImageKit credential check. Does not create test uploads. */
export const verifyImageKitIntegration = onCall(CALLABLE_OPTIONS, async (request) => {
  ensureAdmin(request);
  const id = readIntegrationId(request.data);
  const { row } = await integration(id);
  if (row.active === false) throw new HttpsError('failed-precondition', 'Activa la integración antes de probarla.');
  if (!row.publicKey?.trim().startsWith('public_')) throw new HttpsError('failed-precondition', 'Configura la public key completa (public_…), del mismo par que la private key.');
  try { if (new URL(row.urlEndpoint || '').protocol !== 'https:') throw new Error('https'); }
  catch { throw new HttpsError('failed-precondition', 'Configura un URL endpoint válido con HTTPS.'); }
  const privateKey = await readPrivateKey(resolveProjectId(), id);
  let response: Response;
  try {
    response = await fetch('https://api.imagekit.io/v1/files?limit=1', {
      headers: { Authorization: `Basic ${Buffer.from(privateKey + ':').toString('base64')}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch { throw new HttpsError('unavailable', 'ImageKit no respondió. Reintenta en unos minutos.'); }
  if (response.status === 401 || response.status === 403) throw new HttpsError('failed-precondition', 'ImageKit rechazó la clave o sus permisos. Revisa Developer options → API keys: clave activa y Media Read and write. Al rotarla, actualiza public key y private key del mismo par.');
  if (response.status === 429) throw new HttpsError('resource-exhausted', 'Límite de consultas de ImageKit alcanzado. Espera antes de repetir.');
  if (!response.ok) throw new HttpsError('unavailable', `ImageKit devolvió HTTP ${response.status}. Reintenta más tarde.`);
  return { ok: true as const, scope: 'media-read' as const, backendRelease: IMAGEKIT_BACKEND_RELEASE };
});
