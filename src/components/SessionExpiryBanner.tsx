type Props = {
  secondsLeft: number;
  onContinue: () => void;
};

export function SessionExpiryBanner({ secondsLeft, onContinue }: Props) {
  const safeSeconds = Math.max(0, Math.min(60, Math.ceil(secondsLeft)));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-950/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div>
        <p className="text-sm font-medium text-amber-100">Tu sesión está por caducar</p>
        <p className="mt-0.5 text-sm text-amber-200/85">
          Caduca en <span className="font-semibold tabular-nums text-amber-50">{safeSeconds}</span> segundo
          {safeSeconds === 1 ? '' : 's'}. Continúa para renovar 10 minutos más.
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400"
      >
        Continuar sesión
      </button>
    </div>
  );
}
