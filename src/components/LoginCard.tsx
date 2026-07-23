import { useMemo, useState, type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getAuthClient } from '../firebase';
import { getDeviceId } from '../utils/deviceId';
import { getSessionById, sessionIdFor, upsertSessionOnLogin } from '../services/sessions';
import type { PanelRole } from '../types/cotizacion';
import { ADMIN_PANEL_EMAIL } from '../constants/auth';

type Props = {
  onSuccess: () => void;
};

const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 5 * 60 * 1000; // 5 minutos
const LS_ATTEMPTS_KEY = 'loginAttempts';
const LS_BLOCK_UNTIL_KEY = 'blockUntil';
const LS_LOGIN_FLOW_KEY = 'fh_login_flow';
const LS_LAST_ACTIVE_AT_KEY = 'fh_last_active_at';

const ADMIN_EMAIL = ADMIN_PANEL_EMAIL;
const GUEST_EMAIL = 'invitado@framehouse.com';

export function LoginCard({ onSuccess }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const email = useMemo(() => (isAdmin ? ADMIN_EMAIL : GUEST_EMAIL), [isAdmin]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getAttempts(): number {
    return Number(localStorage.getItem(LS_ATTEMPTS_KEY) || 0);
  }

  function getBlockUntil(): number {
    return Number(localStorage.getItem(LS_BLOCK_UNTIL_KEY) || 0);
  }

  function registerFailedAttempt() {
    const attempts = getAttempts();
    const newAttempts = attempts + 1;
    localStorage.setItem(LS_ATTEMPTS_KEY, String(newAttempts));

    if (newAttempts >= MAX_ATTEMPTS) {
      const blockUntil = Date.now() + BLOCK_TIME;
      localStorage.setItem(LS_BLOCK_UNTIL_KEY, String(blockUntil));
      localStorage.setItem(LS_ATTEMPTS_KEY, '0');
      setError('Demasiados intentos fallidos. Has sido bloqueado por 5 minutos.');
    } else {
      setError(`Credenciales incorrectas. Intento ${newAttempts} de ${MAX_ATTEMPTS}.`);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Necesitas ingresar una contraseña.');
      return;
    }

    setLoading(true);
    localStorage.setItem(LS_LOGIN_FLOW_KEY, '1');
    try {
      const blockUntil = getBlockUntil();
      if (Date.now() < blockUntil) {
        const remainingMinutes = Math.ceil((blockUntil - Date.now()) / 60000);
        setError(`Demasiados intentos. Reintenta nuevamente en ${remainingMinutes} minuto(s).`);
        return;
      }

      let credential;
      try {
        credential = await signInWithEmailAndPassword(getAuthClient(), email, password);
      } catch (authErr) {
        if (authErr instanceof FirebaseError && authErr.code.startsWith('auth/')) {
          registerFailedAttempt();
          return;
        }
        registerFailedAttempt();
        return;
      }

      try {
        const deviceId = getDeviceId();
        const sid = sessionIdFor(credential.user.uid, deviceId);
        const existing = await getSessionById(sid);
        if (existing?.blocked) {
          await signOut(getAuthClient());
          setError('Tu acceso está bloqueado. Contacta al administrador.');
          return;
        }

        localStorage.setItem('fh_login_at', String(Date.now()));
        localStorage.setItem(LS_LAST_ACTIVE_AT_KEY, String(Date.now()));
        localStorage.removeItem(LS_ATTEMPTS_KEY);
        localStorage.removeItem(LS_BLOCK_UNTIL_KEY);

        const role: PanelRole = isAdmin ? 'admin' : 'guest';
        await upsertSessionOnLogin({
          uid: credential.user.uid,
          email: credential.user.email || email,
          role,
          deviceId,
        });

        onSuccess();
      } catch {
        await signOut(getAuthClient());
        setError('No se pudo crear la sesión. Intenta de nuevo.');
      }
    } finally {
      // Mantener fh_login_flow hasta que upsert termine; sin espera fija.
      localStorage.removeItem(LS_LOGIN_FLOW_KEY);
      setLoading(false);
    }
  }

  return (
    <div className="panel-modal-panel mx-auto w-full max-w-md p-8 shadow-xl backdrop-blur-sm">
      <h1 className="text-center text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Frame House Admin Panel
      </h1>
      <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-500">
        Acceso interno · cotizaciones
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 px-4 py-3 transition hover:border-neutral-700">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => {
              setIsAdmin(e.target.checked);
              setPassword('');
              setError(null);
            }}
            className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-500/40"
          />
          <span className="text-sm text-neutral-300">Soy Administrador</span>
        </label>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Usuario
          </label>
          <div className="mt-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-200">
            {email}
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wide text-neutral-500"
          >
            Contraseña
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-3 pr-10 text-sm text-neutral-100 placeholder-neutral-600 outline-none ring-amber-500/0 transition focus:border-neutral-600 focus:ring-2 focus:ring-amber-500/30"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-md border border-transparent text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-200"
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <path d="M3 3l18 18" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-amber-500 active:bg-amber-700"
        >
          {loading ? 'Ingresando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
