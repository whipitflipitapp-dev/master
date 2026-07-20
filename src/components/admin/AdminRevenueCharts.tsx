"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatUsdFromCents } from "@/lib/admin/format-usd";
import type { AdminRevenueTypeRow } from "@/lib/admin/stripe-metrics";

type AdminRevenueChartsProps = {
  revenueByDay30d: { day: string; amountCents: number }[];
  revenueByType: AdminRevenueTypeRow[];
};

export function AdminRevenueCharts({
  revenueByDay30d,
  revenueByType,
}: AdminRevenueChartsProps) {
  const dayData = revenueByDay30d.map((row) => ({
    dayLabel: row.day.slice(5),
    dollars: row.amountCents / 100,
  }));

  const typeData = revenueByType
    .filter((row) => row.collected30dCents > 0 || row.mrrCents > 0)
    .map((row) => ({
      label: row.label.replace(" · ", " · "),
      shortLabel:
        row.key === "other"
          ? "Other"
          : row.label.split(" · ")[0] ?? row.label,
      collected: row.collected30dCents / 100,
      mrr: row.mrrCents / 100,
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Cash collected (30 days)
        </h3>
        {dayData.length === 0 ? (
          <p className="mt-3 py-6 text-center text-sm text-[var(--muted)]">
            No paid invoices in the last 30 days.
          </p>
        ) : (
          <div className="mt-2 h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dayData} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="color-mix(in_srgb,var(--muted)_22%,transparent)"
                />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  width={48}
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  formatter={(value) =>
                    formatUsdFromCents(
                      Math.round(Number(value ?? 0) * 100),
                    )
                  }
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid color-mix(in_srgb,var(--muted)_35%,transparent)",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="dollars"
                  name="Collected"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Revenue by product (30d cash · MRR)
        </h3>
        {typeData.length === 0 ? (
          <p className="mt-3 py-6 text-center text-sm text-[var(--muted)]">
            No subscription revenue typed yet.
          </p>
        ) : (
          <div className="mt-2 h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeData}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="color-mix(in_srgb,var(--muted)_22%,transparent)"
                />
                <XAxis
                  type="number"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  width={72}
                  tick={{ fill: "var(--muted)", fontSize: 9 }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatUsdFromCents(Math.round(Number(value ?? 0) * 100)),
                    name === "collected" ? "30d collected" : "MRR",
                  ]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.label ?? ""
                  }
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid color-mix(in_srgb,var(--muted)_35%,transparent)",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="collected"
                  name="collected"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="mrr"
                  name="mrr"
                  fill="color-mix(in_srgb,var(--accent)_85%,transparent)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
