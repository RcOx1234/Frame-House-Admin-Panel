import { useMemo, useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthClient } from '../firebase';

type Props = {
  onSuccess: () => void;
};

const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 5 * 60 * 1000; // 5 minutos
const LS_ATTEMPTS_KEY = 'loginAttempts';
const LS_BLOCK_UNTIL_KEY = 'blockUntil';

const ADMIN_EMAIL = 'admin@framehouse.com';
const GUEST_EMAIL = 'invitado@framehouse.com';

export function LoginCard({ onSuccess }: Props) {
  const [isGuest, setIsGuest] = useState(false);
  const email = useMemo(() => (isGuest ? GUEST_EMAIL : ADMIN_EMAIL), [isGuest]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getAttempts(): number {
    return Number(localStorage.getItem(LS_ATTEMPTS_KEY) || 0);
  }

  function getBlockUntil(): number {
    return Number(localStorage.getItem(LS_BLOCK_UNTIL_KEY) || 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const blockUntil = getBlockUntil();
      if (Date.now() < blockUntil) {
        setError('Demasiados intentos. Reintenta nuevamente luego.');
        return;
      }

      await signInWithEmailAndPassword(getAuthClient(), email, password);
      localStorage.removeItem(LS_ATTEMPTS_KEY);
      localStorage.removeItem(LS_BLOCK_UNTIL_KEY);
      onSuccess();
    } catch {
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-xl backdrop-blur-sm">
      <h1 className="text-center text-xl font-semibold tracking-tight text-neutral-100">
        Panel de administrador de FRAME HOUSE
      </h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Acceso interno · cotizaciones
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 px-4 py-3 transition hover:border-neutral-700">
          <input
            type="checkbox"
            checked={isGuest}
            onChange={(e) => {
              setIsGuest(e.target.checked);
              setPassword('');
              setError(null);
            }}
            className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-500/40"
          />
          <span className="text-sm text-neutral-300">Soy invitado</span>
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
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none ring-amber-500/0 transition focus:border-neutral-600 focus:ring-2 focus:ring-amber-500/30"
            placeholder="••••••••"
          />
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
