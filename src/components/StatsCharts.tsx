"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export function YearChart({
  data,
}: {
  data: { year: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <Tooltip
          formatter={(v: number) => [`${v}`, "Dives"]}
          cursor={{ fill: "#eff6ff" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#1463e1" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DepthChart({
  data,
}: {
  data: { range: string; count: number }[];
}) {
  const colors = ["#8ed4ff", "#59baff", "#329bff", "#1b7cf5", "#1463e1"];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <Tooltip
          formatter={(v: number) => [`${v}`, "Dives"]}
          cursor={{ fill: "#eff6ff" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
