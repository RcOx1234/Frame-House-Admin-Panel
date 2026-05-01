import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { LoginCard } from './components/LoginCard';
import { AdminPanel } from './pages/AdminPanel';
import type { PanelRole } from './types/cotizacion';
import { getAuthClient } from './firebase';
import { SessionExpiredScreen } from './components/SessionExpiredScreen';
import { BlockedScreen } from './components/BlockedScreen';
import { SessionClosedScreen } from './components/SessionClosedScreen';
import { getDeviceId } from './utils/deviceId';
import { getDb } from './firebase';
import {
  acknowledgeRemoteLogout,
  getSessionById,
  markSessionInactive,
  sessionIdFor,
  touchSession,
  type SessionDoc,
  upsertSessionOnAuthRestore,
} from './services/sessions';

const ADMIN_EMAIL = 'admin@framehouse.com';
const GUEST_EMAIL = 'invitado@framehouse.com';
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos
const LS_LOGIN_AT_KEY = 'fh_login_at';
const LS_LOGIN_FLOW_KEY = 'fh_login_flow';
const LS_LAST_ACTIVE_AT_KEY = 'fh_last_active_at';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const warningDismissedRef = useRef(false);
  const [accessDenied, setAccessDenied] = useState<null | 'blocked' | 'remote_logout'>(null);
  const [remoteLogoutSessionId, setRemoteLogoutSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionDoc | null>(null);

  async function expireSessionNow(sessionId?: string | null) {
    localStorage.removeItem(LS_LOGIN_AT_KEY);
    localStorage.removeItem(LS_LAST_ACTIVE_AT_KEY);
    setShowExpiryWarning(false);
    setSessionExpired(true);
    if (sessionId) {
      await markSessionInactive(sessionId);
    }
    await signOut(getAuthClient());
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setCurrentSession(null);
      return;
    }

    let unsub: (() => void) | null = null;
    let cancelled = false;

    const run = async () => {
      const deviceId = getDeviceId();
      const role: PanelRole = user.email === ADMIN_EMAIL ? 'admin' : 'guest';
      const sid = sessionIdFor(user.uid, deviceId);
      const loginAt = Number(localStorage.getItem(LS_LOGIN_AT_KEY) || 0);
      const lastActiveAt = Number(localStorage.getItem(LS_LAST_ACTIVE_AT_KEY) || 0);
      const baseTs = Math.max(loginAt, lastActiveAt);

      if (baseTs && Date.now() - baseTs > SESSION_TTL_MS) {
        await expireSessionNow(sid);
        return;
      }

      // Verificación inmediata de bloqueo antes de continuar.
      const existing = await getSessionById(sid);
      if (existing?.blocked) {
        setAccessDenied('blocked');
        await signOut(getAuthClient());
        return;
      }

      if (existing?.forceLogout && !existing.blocked) {
        // Evita falso positivo en la primera restauración tras login.
        if (localStorage.getItem(LS_LOGIN_FLOW_KEY) === '1') {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
          const refreshed = await getSessionById(sid);
          if (!refreshed?.forceLogout) {
            // Ya se limpió el cierre remoto por el login actual.
          } else {
            setRemoteLogoutSessionId(sid);
            setAccessDenied('remote_logout');
            await signOut(getAuthClient());
            return;
          }
        } else {
        setRemoteLogoutSessionId(sid);
        setAccessDenied('remote_logout');
        await signOut(getAuthClient());
        return;
        }
      }

      // Sesión restaurada por Auth persistente: no borrar forceLogout aquí.
      const sessionId = await upsertSessionOnAuthRestore({
        uid: user.uid,
        email: user.email || '',
        role,
        deviceId,
      });
      localStorage.setItem(LS_LAST_ACTIVE_AT_KEY, String(Date.now()));

      if (cancelled) return;
      const ref = doc(getDb(), 'sessions', sessionId);
      unsub = onSnapshot(ref, async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        const blockedValue = typeof data.blocked === 'boolean' ? data.blocked : false;
        const forceLogoutValue = typeof data.forceLogout === 'boolean' ? data.forceLogout : false;
        const session: SessionDoc = {
          id: snap.id,
          uid: typeof data.uid === 'string' ? data.uid : user.uid,
          email: typeof data.email === 'string' ? data.email : user.email || '',
          role: data.role === 'admin' ? 'admin' : 'guest',
          deviceId: typeof data.deviceId === 'string' ? data.deviceId : deviceId,
          createdAt: (data.createdAt as SessionDoc['createdAt']) ?? null,
          lastSeen: (data.lastSeen as SessionDoc['lastSeen']) ?? null,
          isActive: typeof data.isActive === 'boolean' ? data.isActive : !(blockedValue || forceLogoutValue),
          blocked: blockedValue,
          forceLogout: forceLogoutValue,
        };
        setCurrentSession(session);

        if (blockedValue) {
          setAccessDenied('blocked');
          await signOut(getAuthClient());
          return;
        }
        if (forceLogoutValue) {
          setRemoteLogoutSessionId(snap.id);
          setAccessDenied('remote_logout');
          await signOut(getAuthClient());
        }
      });
    };

    void run();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!currentSession?.id) return;
    if (accessDenied) return;

    const id = window.setInterval(() => {
      localStorage.setItem(LS_LAST_ACTIVE_AT_KEY, String(Date.now()));
      void touchSession(currentSession.id);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [accessDenied, currentSession?.id, user]);

  useEffect(() => {
    if (!user) return;
    if (!currentSession?.id) return;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void markSessionInactive(currentSession.id);
      } else {
        localStorage.setItem(LS_LAST_ACTIVE_AT_KEY, String(Date.now()));
      }
    };

    const onPageHide = () => {
      void markSessionInactive(currentSession.id);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [currentSession?.id, user]);

  useEffect(() => {
    if (!user) return;

    function isExpired(): boolean {
      const loginAt = Number(localStorage.getItem(LS_LOGIN_AT_KEY) || 0);
      if (!loginAt) return false;
      return Date.now() - loginAt > SESSION_TTL_MS;
    }

    const tick = async () => {
      if (!user) return;
      if (isExpired()) {
        await expireSessionNow(currentSession?.id);
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 15_000);
    return () => window.clearInterval(id);
  }, [currentSession?.id, user]);

  useEffect(() => {
    if (!user) return;
    if (sessionExpired) return;

    const loginAt = Number(localStorage.getItem(LS_LOGIN_AT_KEY) || 0);
    if (!loginAt) return;

    const warnAt = loginAt + SESSION_TTL_MS - 60_000;
    const expireAt = loginAt + SESSION_TTL_MS;
    const now = Date.now();

    const warningDelay = warnAt - now;
    const expireDelay = expireAt - now;

    const warningId =
      warningDelay <= 0
        ? window.setTimeout(() => {
            if (!warningDismissedRef.current) setShowExpiryWarning(true);
          }, 0)
        : window.setTimeout(() => {
            if (!warningDismissedRef.current) setShowExpiryWarning(true);
          }, warningDelay);

    const expireId =
      expireDelay <= 0
        ? window.setTimeout(() => setSessionExpired(true), 0)
        : window.setTimeout(() => setSessionExpired(true), expireDelay);

    return () => {
      window.clearTimeout(warningId);
      window.clearTimeout(expireId);
    };
  }, [sessionExpired, user]);

  const role: PanelRole | null = useMemo(() => {
    if (!user?.email) return null;
    if (user.email === ADMIN_EMAIL) return 'admin';
    if (user.email === GUEST_EMAIL) return 'guest';
    return 'guest';
  }, [user?.email]);

  async function handleLogout() {
    localStorage.removeItem(LS_LOGIN_AT_KEY);
    localStorage.removeItem(LS_LAST_ACTIVE_AT_KEY);
    setShowExpiryWarning(false);
    warningDismissedRef.current = false;
    setSessionExpired(false);
    setAccessDenied(null);
    setRemoteLogoutSessionId(null);
    if (currentSession?.id) {
      await markSessionInactive(currentSession.id);
    }
    await signOut(getAuthClient());
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 text-sm text-neutral-400">
          Verificando sesión…
        </div>
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <SessionExpiredScreen
        onBackToLogin={() => {
          setSessionExpired(false);
          setShowExpiryWarning(false);
          warningDismissedRef.current = false;
        }}
      />
    );
  }

  if (accessDenied === 'blocked') {
    return (
      <BlockedScreen
        onBackToLogin={() => {
          setAccessDenied(null);
          setRemoteLogoutSessionId(null);
          setSessionExpired(false);
          setShowExpiryWarning(false);
          warningDismissedRef.current = false;
        }}
      />
    );
  }

  if (accessDenied === 'remote_logout') {
    return (
      <SessionClosedScreen
        onBackToLogin={() => {
          if (remoteLogoutSessionId) {
            void acknowledgeRemoteLogout(remoteLogoutSessionId);
          }
          setAccessDenied(null);
          setRemoteLogoutSessionId(null);
          setSessionExpired(false);
          setShowExpiryWarning(false);
          warningDismissedRef.current = false;
        }}
      />
    );
  }

  if (!user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12">
        <LoginCard onSuccess={() => {}} />
      </div>
    );
  }

  return (
    <AdminPanel
      role={role}
      onLogout={handleLogout}
      sessionContext={
        currentSession
          ? { uid: currentSession.uid, deviceId: currentSession.deviceId, sessionId: currentSession.id }
          : { uid: user.uid, deviceId: getDeviceId(), sessionId: sessionIdFor(user.uid, getDeviceId()) }
      }
      sessionExpiryWarning={
        showExpiryWarning
          ? {
              message: 'Tu sesión caducará en 1 minuto.',
              onDismiss: () => {
                warningDismissedRef.current = true;
                setShowExpiryWarning(false);
              },
            }
          : null
      }
    />
  );
}
