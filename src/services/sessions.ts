import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { PanelRole } from '../types/cotizacion';

export type SessionDoc = {
  id: string;
  uid: string;
  email: string;
  role: PanelRole;
  deviceId: string;
  deviceName: string;
  browser: string;
  country: string;
  city: string;
  createdAt: Timestamp | null;
  lastSeen: Timestamp | null;
  isActive: boolean;
  blocked: boolean;
  forceLogout: boolean;
};

function asString(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

function asBool(x: unknown): boolean {
  return typeof x === 'boolean' ? x : false;
}

function mapSession(id: string, data: Record<string, unknown>): SessionDoc {
  const blocked = asBool(data.blocked);
  const forceLogout = asBool(data.forceLogout);
  return {
    id,
    uid: asString(data.uid),
    email: asString(data.email),
    role: (data.role === 'admin' ? 'admin' : 'guest') satisfies PanelRole,
    deviceId: asString(data.deviceId),
    deviceName: asString(data.deviceName),
    browser: asString(data.browser),
    country: asString(data.country),
    city: asString(data.city),
    createdAt: (data.createdAt as Timestamp | null | undefined) ?? null,
    lastSeen: (data.lastSeen as Timestamp | null | undefined) ?? null,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : !(blocked || forceLogout),
    blocked,
    forceLogout,
  };
}

export function sessionIdFor(uid: string, deviceId: string): string {
  return `${uid}_${deviceId}`;
}

function getClientMeta() {
  const ua = navigator.userAgent || '';
  const browser = /Edg/i.test(ua)
    ? 'Edge'
    : /Chrome/i.test(ua)
      ? 'Chrome'
      : /Firefox/i.test(ua)
        ? 'Firefox'
        : /Safari/i.test(ua)
          ? 'Safari'
          : 'Navegador';
  const deviceName = navigator.platform ? `${navigator.platform} · ${browser}` : browser;
  const locale = navigator.language || 'es-ES';
  const parts = locale.split('-');
  const country = parts[1] ? parts[1].toUpperCase() : 'N/A';
  return {
    deviceName,
    browser,
    country,
    city: 'N/A',
  };
}

/** Tras login con contraseña: limpia cierre remoto y marca sesión activa. */
export async function upsertSessionOnLogin(input: {
  uid: string;
  email: string;
  role: PanelRole;
  deviceId: string;
}): Promise<string> {
  const db = getDb();
  const id = sessionIdFor(input.uid, input.deviceId);
  const ref = doc(db, 'sessions', id);

  const existing = await getDoc(ref);
  const createdAt = existing.exists() ? undefined : serverTimestamp();
  const meta = getClientMeta();

  await setDoc(
    ref,
    {
      uid: input.uid,
      email: input.email,
      role: input.role,
      deviceId: input.deviceId,
      ...meta,
      ...(createdAt ? { createdAt } : {}),
      lastSeen: serverTimestamp(),
      isActive: true,
      ...(createdAt ? { blocked: false } : {}),
      forceLogout: false,
    },
    { merge: true }
  );

  return id;
}

/**
 * Restauración de Firebase Auth (pestaña/navegador): NO toca forceLogout ni blocked,
 * para no borrar un cierre remoto pendiente antes de detectarlo.
 */
export async function upsertSessionOnAuthRestore(input: {
  uid: string;
  email: string;
  role: PanelRole;
  deviceId: string;
}): Promise<string> {
  const db = getDb();
  const id = sessionIdFor(input.uid, input.deviceId);
  const ref = doc(db, 'sessions', id);

  const existing = await getDoc(ref);
  const createdAt = existing.exists() ? undefined : serverTimestamp();
  const meta = getClientMeta();

  await setDoc(
    ref,
    {
      uid: input.uid,
      email: input.email,
      role: input.role,
      deviceId: input.deviceId,
      ...meta,
      ...(createdAt ? { createdAt, blocked: false, forceLogout: false } : {}),
      lastSeen: serverTimestamp(),
      isActive: true,
    },
    { merge: true }
  );

  return id;
}

export async function acknowledgeRemoteLogout(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sessions', id), {
    forceLogout: false,
    isActive: false,
    lastSeen: serverTimestamp(),
  });
}

export async function getSessionById(id: string): Promise<SessionDoc | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'sessions', id));
  if (!snap.exists()) return null;
  return mapSession(snap.id, snap.data() as Record<string, unknown>);
}

export async function touchSession(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sessions', id), {
    lastSeen: serverTimestamp(),
    isActive: true,
  });
}

export async function setSessionBlocked(id: string, blocked: boolean): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sessions', id), {
    blocked,
    forceLogout: blocked ? false : undefined,
    isActive: blocked ? false : undefined,
    lastSeen: serverTimestamp(),
  });
}

export async function forceLogoutSession(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sessions', id), {
    forceLogout: true,
    isActive: false,
    lastSeen: serverTimestamp(),
  });
}

export async function clearSessionFlags(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sessions', id), {
    blocked: false,
    forceLogout: false,
    isActive: false,
    lastSeen: serverTimestamp(),
  });
}

export async function markSessionActive(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sessions', id), {
    isActive: true,
    lastSeen: serverTimestamp(),
  });
}

export async function markSessionInactive(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sessions', id), {
    isActive: false,
    lastSeen: serverTimestamp(),
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'sessions', id));
}

export async function listSessions(opts?: { limit?: number }): Promise<SessionDoc[]> {
  const db = getDb();
  const q = query(
    collection(db, 'sessions'),
    orderBy('createdAt', 'desc'),
    limit(opts?.limit ?? 50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapSession(d.id, d.data() as Record<string, unknown>));
}

