import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

function formatCallableError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    const maybeCode = (error as Error & { code?: string }).code;
    const maybeDetails = (error as Error & { details?: unknown }).details;
    const maybeMessage = (error as Error & { message?: string }).message;
    const detailsText =
      typeof maybeDetails === 'string'
        ? maybeDetails
        : maybeDetails != null
          ? JSON.stringify(maybeDetails)
          : '';
    const message = [maybeCode, maybeMessage, detailsText].filter(Boolean).join(' | ');
    return new Error(message || fallback);
  }
  return new Error(fallback);
}

export async function uploadToCloudinary(
  file: File,
  opts: { cloudName: string; uploadPreset: string; folder?: string }
): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', opts.uploadPreset);
  if (opts.folder?.trim()) fd.append('folder', opts.folder.trim());

  const isVideo = file.type.startsWith('video/');
  const resource = isVideo ? 'video' : 'auto';
  const url = `https://api.cloudinary.com/v1_1/${opts.cloudName}/${resource}/upload`;

  const res = await fetch(url, { method: 'POST', body: fd });
  const data = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Error al subir a Cloudinary');
  }
  if (!data.secure_url) throw new Error('Cloudinary no devolvió URL');
  return data.secure_url;
}

export type ImageKitAuthResponse = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
};

/** Firma vía httpsCallable (sin fetch a URL de Cloud Functions). */
export async function requestImageKitUploadAuth(integrationId: string): Promise<ImageKitAuthResponse> {
  const fn = httpsCallable<{ integrationId: string }, ImageKitAuthResponse>(
    functions(),
    'getImageKitUploadAuth'
  );
  try {
    const result = await fn({ integrationId });
    return result.data;
  } catch (error) {
    console.error(error);
    throw formatCallableError(error, 'No se pudo obtener la firma de subida para ImageKit');
  }
}

/** Guarda la private key vía Callable únicamente (sin fetch ni URL manual). */
export async function saveImageKitPrivateKeyRemote(integrationId: string, privateKey: string): Promise<void> {
  const fn = httpsCallable<{ integrationId: string; privateKey: string }, { ok: true }>(
    functions(),
    'setImageKitPrivateKey'
  );
  try {
    await fn({ integrationId, privateKey });
  } catch (error) {
    console.error(error);
    throw formatCallableError(error, 'No se pudo guardar la private key en Secret Manager');
  }
}

export async function deleteImageKitPrivateKeyRemote(integrationId: string): Promise<void> {
  const fn = httpsCallable<{ integrationId: string }, { ok: true }>(functions(), 'deleteImageKitPrivateKey');
  try {
    await fn({ integrationId });
  } catch (error) {
    console.error(error);
    throw formatCallableError(error, 'No se pudo eliminar la private key en Secret Manager');
  }
}

export async function uploadToImageKit(
  file: File,
  opts: {
    folder?: string;
    auth: ImageKitAuthResponse;
  }
): Promise<string> {
  const { publicKey, token, expire, signature } = opts.auth;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('fileName', file.name);
  fd.append('publicKey', publicKey);
  fd.append('signature', signature);
  fd.append('token', token);
  fd.append('expire', String(expire));
  if (opts.folder?.trim()) fd.append('folder', opts.folder.trim());

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: fd,
  });
  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Error al subir a ImageKit');
  }
  if (!data.url) throw new Error('ImageKit no devolvió URL');
  return data.url;
}

export function isValidHttpUrl(text: string): boolean {
  try {
    const u = new URL(text.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
