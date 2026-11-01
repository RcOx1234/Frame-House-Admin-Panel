type Props = {
  secondsLeft: number;
  onContinue: () => void;
};

export function SessionExpiryBanner({ secondsLeft, onContinue }: Props) {
  const safeSeconds = Math.max(0, Math.min(60, Math.ceil(secondsLeft)));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/30 bg-brandsoft/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div>
        <p className="text-sm font-medium text-brand">Tu sesión está por caducar</p>
        <p className="mt-0.5 text-sm text-brand/85">
          Caduca en <span className="font-semibold tabular-nums text-brand">{safeSeconds}</span> segundo
          {safeSeconds === 1 ? '' : 's'}. Continúa para renovar 10 minutos más.
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand"
      >
        Continuar sesión
      </button>
    </div>
  );
}
