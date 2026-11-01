type Props = {
  onBackToLogin: () => void;
};

export function SessionClosedScreen({ onBackToLogin }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface/70 p-8 text-center shadow-xl backdrop-blur-sm">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Tu sesión fue cerrada</h1>
        <p className="mt-2 text-sm text-muted">
          Un administrador cerró tu sesión de forma remota. Puedes volver al login para entrar de nuevo.
        </p>
        <button
          type="button"
          onClick={onBackToLogin}
          className="mt-7 w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition hover:bg-brand active:bg-brand"
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
