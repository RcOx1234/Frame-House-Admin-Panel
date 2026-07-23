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
import { ADMIN_PANEL_EMAIL } from './constants/auth';
import { useTheme } from './context/ThemeContext';
import { subscribeGeneralSettings } from './services/settingsFirestore';

const ADMIN_EMAIL = ADMIN_PANEL_EMAIL;
const GUEST_EMAIL = 'invitado@framehouse.com';
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos
const SESSION_WARN_MS = 60_000;
const LS_LOGIN_AT_KEY = 'fh_login_at';
const LS_LOGIN_FLOW_KEY = 'fh_login_flow';
const LS_LAST_ACTIVE_AT_KEY = 'fh_last_active_at';
const ACTIVITY_THROTTLE_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForLoginFlowToFinish(timeoutMs = 15_000): Promise<void> {
  const started = Date.now();
  while (localStorage.getItem(LS_LOGIN_FLOW_KEY) === '1') {
    if (Date.now() - started > timeoutMs) break;
    await sleep(50);
  }
}

function readLastActiveAt(): number {
  return Number(localStorage.getItem(LS_LAST_ACTIVE_AT_KEY) || 0);
}

function bumpLastActiveAt(): void {
  localStorage.setItem(LS_LAST_ACTIVE_AT_KEY, String(Date.now()));
}

export default function App() {
  const { setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionGateReady, setSessionGateReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [expirySecondsLeft, setExpirySecondsLeft] = useState(60);
  const [accessDenied, setAccessDenied] = useState<null | 'blocked' | 'remote_logout'>(null);
  const [remoteLogoutSessionId, setRemoteLogoutSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionDoc | null>(null);
  const expiringRef = useRef(false);

  async function expireSessionNow(sessionId?: string | null) {
    if (expiringRef.current) return;
    expiringRef.current = true;
    try {
      if (sessionId) {
        await markSessionInactive(sessionId);
      }
      localStorage.removeItem(LS_LOGIN_AT_KEY);
      localStorage.removeItem(LS_LAST_ACTIVE_AT_KEY);
      setShowExpiryWarning(false);
      setExpirySecondsLeft(60);
      setSessionExpired(true);
      await signOut(getAuthClient());
    } finally {
      expiringRef.current = false;
    }
  }

  function clearLoginAlerts() {
    setSessionExpired(false);
    setAccessDenied(null);
    setRemoteLogoutSessionId(null);
    setShowExpiryWarning(false);
    setExpirySecondsLeft(60);
  }

  function continueSession() {
    bumpLastActiveAt();
    setShowExpiryWarning(false);
    setExpirySecondsLeft(60);
    if (currentSession?.id) {
      void touchSession(currentSession.id);
    }
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
      setSessionGateReady(true);
      return;
    }

    let unsub: (() => void) | null = null;
    let cancelled = false;
    setSessionGateReady(false);

    const run = async () => {
      const deviceId = getDeviceId();
      const role: PanelRole = user.email === ADMIN_EMAIL ? 'admin' : 'guest';
      const sid = sessionIdFor(user.uid, deviceId);

      // Si hay login en curso, espera a que termine upsertSessionOnLogin antes de forceLogout.
      if (localStorage.getItem(LS_LOGIN_FLOW_KEY) === '1') {
        await waitForLoginFlowToFinish();
      }
      if (cancelled) return;

      const lastActiveAt = readLastActiveAt();
      if (lastActiveAt && Date.now() - lastActiveAt > SESSION_TTL_MS) {
        await expireSessionNow(sid);
        if (!cancelled) setSessionGateReady(true);
        return;
      }

      const existing = await getSessionById(sid);
      if (cancelled) return;

      if (existing?.blocked) {
        setAccessDenied('blocked');
        await signOut(getAuthClient());
        if (!cancelled) setSessionGateReady(true);
        return;
      }

      if (existing?.forceLogout && !existing.blocked) {
        setRemoteLogoutSessionId(sid);
        setAccessDenied('remote_logout');
        await signOut(getAuthClient());
        if (!cancelled) setSessionGateReady(true);
        return;
      }

      const sessionId = await upsertSessionOnAuthRestore({
        uid: user.uid,
        email: user.email || '',
        role,
        deviceId,
      });
      if (!readLastActiveAt()) {
        bumpLastActiveAt();
      }

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
          alias: typeof data.alias === 'string' && data.alias.trim() ? data.alias : null,
          role: data.role === 'admin' ? 'admin' : 'guest',
          deviceId: typeof data.deviceId === 'string' ? data.deviceId : deviceId,
          deviceName: typeof data.deviceName === 'string' ? data.deviceName : '',
          deviceType:
            data.deviceType === 'mobile' || data.deviceType === 'desktop' || data.deviceType === 'tablet'
              ? data.deviceType
              : 'unknown',
          browser: typeof data.browser === 'string' ? data.browser : '',
          os: typeof data.os === 'string' ? data.os : '',
          country: typeof data.country === 'string' ? data.country : '',
          city: typeof data.city === 'string' ? data.city : '',
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

      if (!cancelled) setSessionGateReady(true);
    };

    void run();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeGeneralSettings((s) => {
      setTheme(s.theme);
    });
    return () => unsub();
  }, [setTheme, user]);

  useEffect(() => {
    if (!user) return;
    if (!currentSession?.id) return;
    if (accessDenied) return;

    const id = window.setInterval(() => {
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

  // Actividad real reinicia el reloj de inactividad (throttled).
  useEffect(() => {
    if (!user) return;
    if (accessDenied) return;
    if (sessionExpired) return;

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_THROTTLE_MS) return;
      lastWrite = now;
      bumpLastActiveAt();
    };

    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener('pointerdown', onActivity, opts);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('input', onActivity, opts);
    window.addEventListener('touchstart', onActivity, opts);
    window.addEventListener('scroll', onActivity, opts);

    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('input', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('scroll', onActivity);
    };
  }, [accessDenied, sessionExpired, user]);

  // Único reloj: aviso a 60s e expiración real vía expireSessionNow.
  useEffect(() => {
    if (!user) return;
    if (accessDenied) return;
    if (sessionExpired) return;
    if (!sessionGateReady) return;

    const tick = () => {
      const lastActiveAt = readLastActiveAt();
      if (!lastActiveAt) return;

      const elapsed = Date.now() - lastActiveAt;
      const remaining = SESSION_TTL_MS - elapsed;

      if (remaining <= 0) {
        void expireSessionNow(currentSession?.id);
        return;
      }

      if (remaining <= SESSION_WARN_MS) {
        setShowExpiryWarning(true);
        setExpirySecondsLeft(Math.max(0, Math.ceil(remaining / 1000)));
      } else {
        setShowExpiryWarning(false);
        setExpirySecondsLeft(60);
      }
    };

    void tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [accessDenied, currentSession?.id, sessionExpired, sessionGateReady, user]);

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
    setExpirySecondsLeft(60);
    setSessionExpired(false);
    setAccessDenied(null);
    setRemoteLogoutSessionId(null);
    if (currentSession?.id) {
      await markSessionInactive(currentSession.id);
    }
    await signOut(getAuthClient());
  }

  if (checking || (user && !sessionGateReady)) {
    return (
      <div className="panel-shell flex items-center justify-center px-4 py-12">
        <div className="panel-card-muted px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
          Verificando sesión…
        </div>
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <SessionExpiredScreen
        onBackToLogin={() => {
          clearLoginAlerts();
        }}
      />
    );
  }

  if (accessDenied === 'blocked') {
    return (
      <BlockedScreen
        onBackToLogin={() => {
          clearLoginAlerts();
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
          clearLoginAlerts();
        }}
      />
    );
  }

  if (!user || !role) {
    return (
      <div className="panel-shell flex items-center justify-center px-4 py-12 max-md:h-[100dvh] max-md:min-h-0 max-md:overflow-hidden max-md:py-6">
        <LoginCard onSuccess={clearLoginAlerts} />
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
              secondsLeft: expirySecondsLeft,
              onContinue: continueSession,
            }
          : null
      }
    />
  );
}
