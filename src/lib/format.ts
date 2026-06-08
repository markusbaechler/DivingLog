// Dive times are stored as "floating" local wall-clock time (kept verbatim in
// UTC) so that a dive logged at 10:28 always shows 10:28, regardless of the
// viewer's timezone. All formatting therefore uses UTC.

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** Value for <input type="datetime-local"> – the stored wall-clock verbatim. */
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Stored value's UTC portion already is the local wall-clock.
  return iso.slice(0, 16);
}

/** Convert a datetime-local input value back to a stored ISO (treated as UTC). */
export function localInputToIso(value: string): string {
  if (!value) return new Date().toISOString();
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(value)) return new Date(value).toISOString();
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const d = new Date(`${withSeconds}Z`);
  return Number.isNaN(d.getTime()) ? new Date(value).toISOString() : d.toISOString();
}

export function num(v: number | null | undefined, suffix = ""): string {
  if (v == null) return "—";
  return `${v}${suffix}`;
}
