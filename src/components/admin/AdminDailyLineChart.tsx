"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminDayCountRow } from "@/lib/admin/metrics-types";

type AdminDailyLineChartProps = {
  data: AdminDayCountRow[];
  seriesName: string;
  emptyMessage: string;
  stroke?: string;
};

export function AdminDailyLineChart({
  data,
  seriesName,
  emptyMessage,
  stroke = "var(--primary)",
}: AdminDailyLineChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">{emptyMessage}</p>
    );
  }

  const chartData = data.map((row) => ({
    dayLabel: row.day.slice(5),
    count: row.count,
  }));

  return (
    <div className="h-[220px] w-full min-w-0 pt-1">
      <ResponsiveContainer width="100%" height="100%" minHeight={220} minWidth={0}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="color-mix(in_srgb,var(--muted)_22%,transparent)"
          />
          <XAxis
            dataKey="dayLabel"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{
              stroke: "color-mix(in_srgb,var(--muted)_35%,transparent)",
            }}
          />
          <YAxis
            width={36}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{
              stroke: "color-mix(in_srgb,var(--muted)_35%,transparent)",
            }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid color-mix(in_srgb,var(--muted)_35%,transparent)",
              borderRadius: "10px",
              fontSize: "12px",
            }}
            labelFormatter={(label) => (label ? String(label) : "")}
          />
          <Line
            type="monotone"
            dataKey="count"
            name={seriesName}
            stroke={stroke}
            strokeWidth={2}
            dot={{ r: 2, fill: stroke }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
