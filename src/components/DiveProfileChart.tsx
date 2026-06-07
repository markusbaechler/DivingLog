"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DiveSample } from "@/lib/types";

export function DiveProfileChart({ samples }: { samples: DiveSample[] }) {
  const data = samples
    .slice()
    .sort((a, b) => a.time_seconds - b.time_seconds)
    .map((s) => ({
      min: Math.round((s.time_seconds / 60) * 10) / 10,
      depth: s.depth != null ? -Math.abs(s.depth) : null,
      temp: s.temperature,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="depthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#329bff" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#1463e1" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="min"
          tick={{ fontSize: 11 }}
          unit=" min"
          stroke="#94a3b8"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="#94a3b8"
          tickFormatter={(v) => `${Math.abs(v)}`}
          unit=" m"
        />
        <Tooltip
          formatter={(value: number, name) =>
            name === "depth"
              ? [`${Math.abs(value)} m`, "Tiefe"]
              : [`${value} °C`, "Temp."]
          }
          labelFormatter={(l) => `${l} min`}
        />
        <Area
          type="monotone"
          dataKey="depth"
          stroke="#1463e1"
          strokeWidth={2}
          fill="url(#depthFill)"
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
