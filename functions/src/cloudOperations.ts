import { HttpsError } from 'firebase-functions/v2/https';
import type { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export const IMAGEKIT_BACKEND_RELEASE = 'frame-house-imagekit-2026-11-01-v2';
export type CloudStage = 'read-integration' | 'write-integration' | 'create-secret' | 'add-secret-version' | 'read-secret' | 'delete-secret';

export function cloudCode(error: unknown): number | string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'number' || typeof code === 'string' ? code : undefined;
}

/** Never include provider exception messages, request payloads or keys in logs/responses. */
export async function runCloudOperation<T>(stage: CloudStage, operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof HttpsError) throw error;
    const code = cloudCode(error);
    const message = error instanceof Error ? error.message : '';
    const details = { stage, cloudCode: code ?? 'unknown', backendRelease: IMAGEKIT_BACKEND_RELEASE };
    console.error('ImageKit backend operation failed', details);
    if (/SERVICE_DISABLED|API has not been used|API.*disabled|service.*disabled/i.test(message)) {
      throw new HttpsError('failed-precondition', 'La API de Google Cloud requerida está deshabilitada. Activa Secret Manager API (o Firestore, si falla la integración) en el proyecto Firebase y reintenta.', { ...details, reason: 'api-disabled' });
    }
    if (code === 7 || code === 403 || code === 'PERMISSION_DENIED') {
      const permission = stage === 'create-secret' ? 'secretmanager.secrets.create'
        : stage === 'add-secret-version' ? 'secretmanager.versions.add'
        : stage === 'read-secret' ? 'secretmanager.versions.access'
        : stage === 'delete-secret' ? 'secretmanager.secrets.delete'
        : 'acceso de la cuenta de servicio a Firestore';
      throw new HttpsError('failed-precondition', `Firebase no tiene permiso para esta operación (${permission}). Revisa la cuenta de servicio de ejecución y sus permisos IAM. Consulta docs/IMAGEKIT-DEPLOY.md.`, { ...details, reason: 'iam-permission' });
    }
    if (code === 5 || code === 404 || code === 'NOT_FOUND') {
      throw new HttpsError('failed-precondition', 'No se encontró el recurso de Firebase/Secret Manager. Guarda primero la integración y su private key en el proyecto correcto.', { ...details, reason: 'resource-missing' });
    }
    if (code === 8 || code === 429 || code === 'RESOURCE_EXHAUSTED') {
      throw new HttpsError('resource-exhausted', 'Google Cloud alcanzó una cuota. Revisa la facturación/cuotas del proyecto y reintenta.', details);
    }
    if (code === 4 || code === 14 || code === 503 || code === 'UNAVAILABLE') {
      throw new HttpsError('unavailable', 'Google Cloud no respondió a tiempo. Reintenta en unos minutos.', details);
    }
    throw new HttpsError('internal', 'Falló una operación del servidor Firebase. Consulta Functions → Logs usando la etapa indicada; no vuelvas a pegar tu clave en mensajes de soporte.', { ...details, reason: 'unexpected-cloud-error' });
  }
}

/** Numeric ALREADY_EXISTS is stable; an existing integration must still accept key rotation. */
export async function persistPrivateKey(
  client: Pick<SecretManagerServiceClient, 'createSecret' | 'addSecretVersion'>,
  projectId: string,
  secretId: string,
  privateKey: string
): Promise<void> {
  await runCloudOperation('create-secret', async () => {
    try {
      await client.createSecret({ parent: `projects/${projectId}`, secretId, secret: { replication: { automatic: {} } } });
    } catch (error) {
      const code = cloudCode(error);
      if (code !== 6 && code !== 409 && code !== 'ALREADY_EXISTS') throw error;
    }
  });
  await runCloudOperation('add-secret-version', async () => {
    await client.addSecretVersion({ parent: `projects/${projectId}/secrets/${secretId}`, payload: { data: Buffer.from(privateKey, 'utf8') } });
  });
}
