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
  alias: string | null;
  role: PanelRole;
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browser: string;
  os: string;
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

function asNullableString(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const v = x.trim();
  return v.length ? v : null;
}

function asDeviceType(x: unknown): SessionDoc['deviceType'] {
  return x === 'mobile' || x === 'desktop' || x === 'tablet' ? x : 'unknown';
}

function mapSession(id: string, data: Record<string, unknown>): SessionDoc {
  const blocked = asBool(data.blocked);
  const forceLogout = asBool(data.forceLogout);
  return {
    id,
    uid: asString(data.uid),
    email: asString(data.email),
    alias: asNullableString(data.alias),
    role: (data.role === 'admin' ? 'admin' : 'guest') satisfies PanelRole,
    deviceId: asString(data.deviceId),
    deviceName: asString(data.deviceName),
    deviceType: asDeviceType(data.deviceType),
    browser: asString(data.browser),
    os: asString(data.os),
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
  const lower = ua.toLowerCase();
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /opr\//i.test(ua)
      ? 'Opera'
      : /firefox\//i.test(ua)
        ? 'Firefox'
        : /safari/i.test(ua) && !/chrome|crios|android/i.test(ua)
          ? 'Safari'
          : /chrome|crios/i.test(ua)
            ? 'Chrome'
            : 'Navegador';
  const os = /android/i.test(ua)
    ? 'Android'
    : /iphone|ipad|ipod/i.test(ua)
      ? 'iOS'
      : /windows nt/i.test(ua)
        ? 'Windows'
        : /mac os x/i.test(ua)
          ? 'Mac'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Desconocido';

  const isTablet = /ipad|tablet|sm-t|tab/i.test(lower);
  const isMobile = !isTablet && /mobi|iphone|ipod|android/i.test(lower);
  const deviceType: SessionDoc['deviceType'] = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  const brandHint = /honor|huawei|samsung|xiaomi|redmi|pixel|motorola|oneplus|realme|oppo|vivo/i.exec(ua)?.[0];
  const typeLabel = os === 'iOS' && /iphone/i.test(ua) ? 'iPhone' : os;
  const deviceName =
    deviceType === 'mobile' && brandHint
      ? `${typeLabel} - ${browser} (${brandHint[0].toUpperCase()}${brandHint.slice(1)})`
      : `${typeLabel} - ${browser}`;

  return {
    deviceName,
    deviceType,
    browser,
    os,
  };
}

async function getGeoMeta(): Promise<{ country: string; city: string }> {
  const fallback = { country: 'Desconocido', city: 'Desconocido' };
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    window.clearTimeout(timeout);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { country_name?: unknown; city?: unknown };
    const country = typeof data.country_name === 'string' && data.country_name.trim() ? data.country_name : fallback.country;
    const city = typeof data.city === 'string' && data.city.trim() ? data.city : fallback.city;
    return { country, city };
  } catch {
    return fallback;
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
  const geo = await getGeoMeta();

  await setDoc(
    ref,
    {
      uid: input.uid,
      email: input.email,
      role: input.role,
      deviceId: input.deviceId,
      ...meta,
      ...geo,
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
  const geo = await getGeoMeta();

  await setDoc(
    ref,
    {
      uid: input.uid,
      email: input.email,
      role: input.role,
      deviceId: input.deviceId,
      ...meta,
      ...geo,
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
  const payload: {
    blocked: boolean;
    lastSeen: ReturnType<typeof serverTimestamp>;
    forceLogout?: boolean;
    isActive?: boolean;
  } = {
    blocked,
    lastSeen: serverTimestamp(),
  };
  if (blocked) {
    payload.forceLogout = false;
    payload.isActive = false;
  }
  await updateDoc(doc(db, 'sessions', id), payload);
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

export async function updateSessionAlias(id: string, alias: string | null): Promise<void> {
  const db = getDb();
  const normalized = typeof alias === 'string' ? alias.trim() : '';
  await updateDoc(doc(db, 'sessions', id), {
    alias: normalized.length ? normalized : null,
    lastSeen: serverTimestamp(),
  });
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

