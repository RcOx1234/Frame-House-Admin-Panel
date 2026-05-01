import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { LoginCard } from './components/LoginCard';
import { AdminPanel } from './pages/AdminPanel';
import type { PanelRole } from './types/cotizacion';
import { getAuthClient } from './firebase';
import { SessionExpiredScreen } from './components/SessionExpiredScreen';

const ADMIN_EMAIL = 'admin@framehouse.com';
const GUEST_EMAIL = 'invitado@framehouse.com';
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos
const LS_LOGIN_AT_KEY = 'fh_login_at';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const warningDismissedRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

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
        setShowExpiryWarning(false);
        setSessionExpired(true);
        localStorage.removeItem(LS_LOGIN_AT_KEY);
        await signOut(getAuthClient());
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 15_000);
    return () => window.clearInterval(id);
  }, [user]);

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
    setShowExpiryWarning(false);
    warningDismissedRef.current = false;
    setSessionExpired(false);
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
