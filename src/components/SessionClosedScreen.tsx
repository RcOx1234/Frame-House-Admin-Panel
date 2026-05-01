type Props = {
  onBackToLogin: () => void;
};

export function SessionClosedScreen({ onBackToLogin }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 text-center shadow-xl backdrop-blur-sm">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Tu sesión fue cerrada</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Un administrador cerró tu sesión de forma remota. Puedes volver al login para entrar de nuevo.
        </p>
        <button
          type="button"
          onClick={onBackToLogin}
          className="mt-7 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-amber-500 active:bg-amber-700"
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
