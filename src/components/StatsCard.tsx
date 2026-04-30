type Props = {
  title: string;
  value: string | number;
  hint?: string;
};

export function StatsCard({ title, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-600">{hint}</p> : null}
    </div>
  );
}
