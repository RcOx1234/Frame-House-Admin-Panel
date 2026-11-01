import { beginLoginFlow } from '../utils/loginFlow';
import { lazy, Suspense } from 'react';
const BrandMotion = lazy(() => import('./BrandMotion'));
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
    const finishLoginFlow = beginLoginFlow();
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
      finishLoginFlow();
      setLoading(false);
    }
  }

  return (
    <div className="studio-login">
      <section className="login-art" aria-label="Frame House"><a className="studio-brand" href="https://frame-house.vercel.app" target="_blank" rel="noreferrer"><img src="/frame-house-logo.png" width="38" height="38" alt=""/><span>FRAME HOUSE<small>CREATIVE STUDIO</small></span></a><div className="login-art-scene"><Suspense fallback={<div className="motion-placeholder"/>}><BrandMotion/></Suspense></div><div className="login-art-caption"><span className="studio-eyebrow">DETRÁS DE CADA GRAN IDEA</span><h2>El siguiente<br/>gran frame.</h2><p>Un espacio para crear, organizar y hacer que las cosas pasen.</p></div><span className="login-art-footer">FRAME HOUSE · ESPACIO DE TRABAJO</span></section>
      <section className="login-form-panel"><div className="login-form-inner"><p className="studio-eyebrow">BIENVENIDO A TU ESTUDIO</p>
      <h1 className="login-title">
        Frame House Admin Panel
      </h1>
      <p className="mt-3 text-sm text-muted dark:text-muted">
        Acceso interno · cotizaciones
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="login-role flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-canvas/50 px-4 py-3 transition hover:border-line">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => {
              setIsAdmin(e.target.checked);
              setPassword('');
              setError(null);
            }}
            className="h-4 w-4 rounded border-line bg-surface text-brand focus:ring-brand/40"
          />
          <span className="text-sm text-ink">Soy Administrador</span>
        </label>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-muted">
            Usuario
          </label>
          <div className="mt-1 rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink">
            {email}
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wide text-muted"
          >
            Contraseña
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              name="password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas py-2.5 pl-3 pr-10 text-sm text-ink placeholder-muted outline-none ring-brand/0 transition focus:border-line focus:ring-2 focus:ring-brand/30"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-md border border-transparent text-muted transition hover:bg-surface hover:text-ink"
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
          <p id="login-error" role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="login-submit w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition hover:bg-brand active:bg-brand"
        >
          {loading ? 'Ingresando…' : 'Entrar'} <span aria-hidden="true">↗</span>
        </button>
      </form><p className="login-security">Acceso interno · Conexión segura</p></div></section>
    </div>
  );
}
