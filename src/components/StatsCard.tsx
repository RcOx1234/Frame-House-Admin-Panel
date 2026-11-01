type Props = {
  title: string;
  value: string | number;
  hint?: string;
};

export function StatsCard({ title, value, hint }: Props) {
  return (
    <div className="studio-stat rounded-xl border border-line bg-surface/60 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
