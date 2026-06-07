import type { DiveWithSite } from "./types";

export interface DiveStats {
  totalDives: number;
  totalBottomTimeMin: number;
  totalBottomTimeH: number;
  maxDepth: number;
  avgDepth: number;
  avgDuration: number;
  longestDiveMin: number;
  coldestTemp: number | null;
  warmestTemp: number | null;
  countries: number;
  sites: number;
  firstDive: string | null;
  lastDive: string | null;
  divesPerYear: { year: string; count: number }[];
  depthBuckets: { range: string; count: number }[];
  topSites: { name: string; count: number }[];
}

function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function computeStats(dives: DiveWithSite[]): DiveStats {
  const total = dives.length;
  const depths = dives.map((d) => d.max_depth).filter((v): v is number => v != null);
  const durations = dives.map((d) => d.duration).filter((v): v is number => v != null);
  const avgDepths = dives.map((d) => d.avg_depth).filter((v): v is number => v != null);
  const temps = dives
    .map((d) => d.water_temp_bottom ?? d.water_temp_surface)
    .filter((v): v is number => v != null);

  const totalBottomTime = durations.reduce((a, b) => a + b, 0);

  // Tauchgänge pro Jahr
  const yearMap = new Map<string, number>();
  for (const d of dives) {
    const year = d.dive_date.slice(0, 4);
    yearMap.set(year, (yearMap.get(year) ?? 0) + 1);
  }
  const divesPerYear = [...yearMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => ({ year, count }));

  // Tiefenverteilung
  const buckets = [
    { range: "0–10 m", min: 0, max: 10 },
    { range: "10–20 m", min: 10, max: 20 },
    { range: "20–30 m", min: 20, max: 30 },
    { range: "30–40 m", min: 30, max: 40 },
    { range: "> 40 m", min: 40, max: Infinity },
  ];
  const depthBuckets = buckets.map((b) => ({
    range: b.range,
    count: depths.filter((d) => d >= b.min && d < b.max).length,
  }));

  // Top-Tauchplätze
  const siteMap = new Map<string, number>();
  for (const d of dives) {
    const name = d.dive_site?.name;
    if (name) siteMap.set(name, (siteMap.get(name) ?? 0) + 1);
  }
  const topSites = [...siteMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const countries = new Set(
    dives.map((d) => d.dive_site?.country).filter((c): c is string => !!c),
  ).size;
  const sites = new Set(
    dives.map((d) => d.dive_site_id).filter((s): s is string => !!s),
  ).size;

  const sorted = [...dives].sort((a, b) => a.dive_date.localeCompare(b.dive_date));

  return {
    totalDives: total,
    totalBottomTimeMin: totalBottomTime,
    totalBottomTimeH: round(totalBottomTime / 60),
    maxDepth: depths.length ? Math.max(...depths) : 0,
    avgDepth: avgDepths.length
      ? round(avgDepths.reduce((a, b) => a + b, 0) / avgDepths.length)
      : 0,
    avgDuration: durations.length
      ? Math.round(totalBottomTime / durations.length)
      : 0,
    longestDiveMin: durations.length ? Math.max(...durations) : 0,
    coldestTemp: temps.length ? Math.min(...temps) : null,
    warmestTemp: temps.length ? Math.max(...temps) : null,
    countries,
    sites,
    firstDive: sorted[0]?.dive_date ?? null,
    lastDive: sorted[sorted.length - 1]?.dive_date ?? null,
    divesPerYear,
    depthBuckets,
    topSites,
  };
}
