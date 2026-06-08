"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./DiveMap";

// Leaflet greift auf `window` zu → nur clientseitig laden.
const DiveMap = dynamic(
  () => import("./DiveMap").then((m) => m.DiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-ocean-50 text-sm text-ocean-400 dark:bg-slate-900">
        Loading map…
      </div>
    ),
  },
);

export function MapClient(props: { points: MapPoint[]; height?: string }) {
  return <DiveMap {...props} />;
}
