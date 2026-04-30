import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { LoginCard } from './components/LoginCard';
import { AdminPanel } from './pages/AdminPanel';
import type { PanelRole } from './types/cotizacion';
import { getAuthClient } from './firebase';

const ADMIN_EMAIL = 'admin@framehouse.com';
const GUEST_EMAIL = 'invitado@framehouse.com';
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos
const LS_LOGIN_AT_KEY = 'fh_login_at';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

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
        localStorage.removeItem(LS_LOGIN_AT_KEY);
        await signOut(getAuthClient());
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 15_000);
    return () => window.clearInterval(id);
  }, [user]);

  const role: PanelRole | null = useMemo(() => {
    if (!user?.email) return null;
    if (user.email === ADMIN_EMAIL) return 'admin';
    if (user.email === GUEST_EMAIL) return 'guest';
    return 'guest';
  }, [user?.email]);

  async function handleLogout() {
    localStorage.removeItem(LS_LOGIN_AT_KEY);
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

  if (!user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12">
        <LoginCard onSuccess={() => {}} />
      </div>
    );
  }

  return <AdminPanel role={role} onLogout={handleLogout} />;
}
