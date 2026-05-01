type Props = {
  message: string;
  onDismiss: () => void;
};

export function SessionExpiryBanner({ message, onDismiss }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-950/30 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-amber-200">Aviso de sesión</p>
        <p className="mt-0.5 text-sm text-amber-200/80">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg border border-amber-500/20 px-2.5 py-1 text-sm font-medium text-amber-200/90 transition hover:border-amber-500/35 hover:bg-amber-950/30"
        aria-label="Cerrar aviso de expiración"
        title="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

