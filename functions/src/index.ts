import * as crypto from 'crypto';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { initializeApp, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const ADMIN_PANEL_EMAIL = 'admin@framehouse.com';

const INTEGRATIONS_PATH = 'panel_settings/general/integrations';

function buildImageKitSecretName(integrationId: string) {
  return `IMAGEKIT_PRIVATE_KEY_${integrationId}`.replace(/-/g, '_').toUpperCase();
}

function secretResourceName(projectId: string, integrationId: string): string {
  return `projects/${projectId}/secrets/${buildImageKitSecretName(integrationId)}`;
}

function ensureAdmin(request: { auth?: { token?: Record<string, unknown> } }): void {
  const email = request.auth?.token?.email;
  if (!email || email !== ADMIN_PANEL_EMAIL) {
    throw new HttpsError('permission-denied', 'Solo el administrador del panel puede usar esta función.');
  }
}

function app() {
  if (!getApps().length) initializeApp();
  return getApps()[0]!;
}

function integrationSecretId(integrationId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(integrationId)) {
    throw new HttpsError('invalid-argument', 'integrationId no válido');
  }
  return buildImageKitSecretName(integrationId);
}

function resolveProjectId(): string {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || app().options.projectId;
  if (!projectId) {
    throw new HttpsError(
      'internal',
      'No se pudo resolver projectId (GCLOUD_PROJECT/GCP_PROJECT). Verifica variables de entorno en Cloud Functions.'
    );
  }
  return projectId;
}

async function readPrivateKey(projectId: string, integrationId: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const name = `${secretResourceName(projectId, integrationId)}/versions/latest`;
  try {
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data;
    const key =
      typeof payload === 'string' ? payload : payload instanceof Uint8Array ? Buffer.from(payload).toString('utf8') : '';
    const trimmed = key.trim();
    if (!trimmed) throw new Error('empty');
    return trimmed;
  } catch {
    const secretId = integrationSecretId(integrationId);
    throw new HttpsError(
      'failed-precondition',
      `No se encontró o no se puede leer el secret ${secretId}. Créalo con el panel o con: firebase functions:secrets:set ${secretId}`
    );
  }
}

type IntegrationSnap = {
  provider?: string;
  active?: boolean;
  publicKey?: string;
  urlEndpoint?: string;
};

/** Firma cliente ImageKit: token, expire, signature + claves públicas desde Firestore. */
export const getImageKitUploadAuth = onCall({ cors: true, region: 'us-central1' }, async (request) => {
    ensureAdmin(request);
    const integrationId = typeof request.data?.integrationId === 'string' ? request.data.integrationId.trim() : '';
    if (!integrationId) {
      throw new HttpsError('invalid-argument', 'integrationId es obligatorio');
    }
    const normalizedSecretName = integrationSecretId(integrationId);
    console.log('Normalized secret:', normalizedSecretName);

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || app().options.projectId;
    if (!projectId) {
      throw new HttpsError('internal', 'No se pudo resolver el proyecto');
    }

    const db = getFirestore(app());
    const docRef = db.doc(`${INTEGRATIONS_PATH}/${integrationId}`);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Integración no encontrada');
    }
    const row = snap.data() as IntegrationSnap;
    if (row.provider !== 'imagekit') {
      throw new HttpsError('failed-precondition', 'La integración no es ImageKit');
    }
    if (row.active === false) {
      throw new HttpsError('failed-precondition', 'La integración ImageKit está inactiva');
    }
    const publicKey = typeof row.publicKey === 'string' ? row.publicKey.trim() : '';
    const urlEndpoint = typeof row.urlEndpoint === 'string' ? row.urlEndpoint.trim() : '';
    if (!publicKey || !urlEndpoint) {
      throw new HttpsError('failed-precondition', 'Configura publicKey y urlEndpoint en la integración');
    }

    const privateKey = await readPrivateKey(projectId, integrationId);
    const token = crypto.randomBytes(16).toString('hex');
    const expire = Math.floor(Date.now() / 1000) + 30 * 60;
    const signature = crypto.createHmac('sha1', privateKey).update(token + expire).digest('hex');

    return { token, expire, signature, publicKey, urlEndpoint };
  }
);

/** Guarda la private key en Secret Manager y marca hasPrivateKey en Firestore (nunca sale al cliente). */
export const setImageKitPrivateKey = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  ensureAdmin(request);
  const integrationId =
    typeof request.data?.integrationId === 'string' ? request.data.integrationId.trim() : '';
  const privateKey =
    typeof request.data?.privateKey === 'string' ? request.data.privateKey.trim() : '';

  if (!integrationId || !privateKey) {
    throw new HttpsError('invalid-argument', 'integrationId y privateKey son obligatorios');
  }

  const secretId = integrationSecretId(integrationId); // validates chars + normaliza formato
  console.log('Normalized secret:', secretId);
  const projectId = resolveProjectId();

  const db = getFirestore(app());
  const docRef = db.doc(`${INTEGRATIONS_PATH}/${integrationId}`);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Integración no encontrada. Guarda antes la cuenta en Firestore desde el panel.');
  }
  const row = snap.data() as IntegrationSnap;
  if (row.provider !== 'imagekit') {
    throw new HttpsError('failed-precondition', 'Solo aplica a integraciones ImageKit');
  }

  const client = new SecretManagerServiceClient();
  const parent = `projects/${projectId}`;
  const secretName = secretResourceName(projectId, integrationId);
  console.log('Creating secret:', secretName);

  try {
    await client.createSecret({
      parent,
      secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });
    console.log('Secret created');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    const lower = msg.toLowerCase();
    if (!lower.includes('already exists')) {
      throw new HttpsError(
        'internal',
        `Error creando secret ${secretName} en project ${projectId}: ${msg}. Verifica permisos IAM de la service account de Cloud Functions Gen2 para Secret Manager (roles/secretmanager.admin o roles/secretmanager.secretVersionAdder + acceso al secret).`
      );
    }
    console.log('Secret already exists, continuing with new version');
  }

  try {
    console.log('Adding secret version');
    await client.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(privateKey, 'utf8'),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    throw new HttpsError(
      'internal',
      `Error agregando versión al secret ${secretName} en project ${projectId}: ${msg}. Verifica permisos IAM para addSecretVersion en Secret Manager.`
    );
  }

  try {
    await docRef.set(
      {
        hasPrivateKey: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    throw new HttpsError(
      'internal',
      `La private key se guardó en Secret Manager (${secretName}), pero falló actualizar Firestore: ${msg}`
    );
  }

  console.log('Secret saved successfully');

  return { ok: true as const };
});

/** Elimina el secret de Secret Manager y marca hasPrivateKey=false en Firestore. */
export const deleteImageKitPrivateKey = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  ensureAdmin(request);
  const integrationId =
    typeof request.data?.integrationId === 'string' ? request.data.integrationId.trim() : '';
  if (!integrationId) {
    throw new HttpsError('invalid-argument', 'integrationId es obligatorio');
  }

  integrationSecretId(integrationId); // validates chars + normaliza formato

  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || app().options.projectId;
  if (!projectId) {
    throw new HttpsError('internal', 'No se pudo resolver el proyecto');
  }

  const db = getFirestore(app());
  const docRef = db.doc(`${INTEGRATIONS_PATH}/${integrationId}`);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Integración no encontrada.');
  }
  const row = snap.data() as IntegrationSnap;
  if (row.provider !== 'imagekit') {
    throw new HttpsError('failed-precondition', 'Solo aplica a integraciones ImageKit');
  }

  const client = new SecretManagerServiceClient();
  const name = secretResourceName(projectId, integrationId);
  try {
    await client.deleteSecret({ name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Si ya no existe, igual continuamos para reflejar el estado en Firestore.
    if (!msg.toLowerCase().includes('not found') && !msg.toLowerCase().includes('404')) {
      throw new HttpsError('internal', `Secret Manager: ${msg}`);
    }
  }

  await docRef.set(
    {
      hasPrivateKey: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true as const };
});
