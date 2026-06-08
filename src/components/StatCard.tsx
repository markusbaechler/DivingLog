export function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-ocean-200 bg-ocean-50 dark:border-ocean-900 dark:bg-ocean-950"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-ocean-900 dark:text-ocean-200">
        {value}
        {unit && (
          <span className="ml-1 text-base font-medium text-slate-400 dark:text-slate-500">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
