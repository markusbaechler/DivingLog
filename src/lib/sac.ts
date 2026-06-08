import type { Dive } from "./types";

/**
 * Surface Air Consumption (SAC) in l/min – auch "AMV" (Atemminutenvolumen).
 *
 * SAC = (Δp · Flaschenvolumen) / (Tauchzeit · (Ø Tiefe / 10 + 1))
 *
 * Benötigt Start-/Enddruck (bar), Flaschenvolumen (l), Dauer (min) und eine
 * Tiefenangabe (Ø Tiefe bevorzugt, sonst halbe Maximaltiefe als Näherung).
 * Liefert null, wenn die Daten nicht ausreichen.
 */
export function computeSac(dive: Pick<
  Dive,
  "pressure_start" | "pressure_end" | "tank_volume" | "duration" | "avg_depth" | "max_depth"
>): number | null {
  const { pressure_start, pressure_end, tank_volume, duration } = dive;
  if (
    pressure_start == null ||
    pressure_end == null ||
    tank_volume == null ||
    duration == null ||
    duration <= 0
  ) {
    return null;
  }
  const deltaP = pressure_start - pressure_end;
  if (deltaP <= 0) return null;

  const depth = dive.avg_depth ?? (dive.max_depth != null ? dive.max_depth / 2 : null);
  if (depth == null) return null;

  const ata = depth / 10 + 1;
  const sac = (deltaP * tank_volume) / (duration * ata);
  return Math.round(sac * 10) / 10;
}
