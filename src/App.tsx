import { useState } from 'react';
import { LoginCard } from './components/LoginCard';
import { AdminPanel } from './pages/AdminPanel';
import type { PanelRole } from './types/cotizacion';
import { SESSION_KEY } from './constants/session';

function readStoredRole(): PanelRole | null {
  const r = sessionStorage.getItem(SESSION_KEY);
  return r === 'admin' || r === 'guest' ? r : null;
}

export default function App() {
  const [role, setRole] = useState<PanelRole | null>(readStoredRole);

  function handleLogin(next: PanelRole) {
    sessionStorage.setItem(SESSION_KEY, next);
    setRole(next);
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setRole(null);
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12">
        <LoginCard onSuccess={handleLogin} />
      </div>
    );
  }

  return <AdminPanel role={role} onLogout={handleLogout} />;
}
