"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const PLAN_COLORS = [
  "color-mix(in_srgb,var(--muted)_70%,transparent)",
  "var(--primary)",
  "var(--accent)",
];

type AdminPlanMixChartProps = {
  free: number;
  pro: number;
  aiChef: number;
};

export function AdminPlanMixChart({ free, pro, aiChef }: AdminPlanMixChartProps) {
  const data = [
    { name: "Free", value: free },
    { name: "Pro", value: pro },
    { name: "AI Chef", value: aiChef },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">
        No profiles yet.
      </p>
    );
  }

  return (
    <div className="h-[220px] w-full min-w-0 pt-1">
      <ResponsiveContainer width="100%" height="100%" minHeight={220} minWidth={0}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid color-mix(in_srgb,var(--muted)_35%,transparent)",
              borderRadius: "10px",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[length:var(--text-caption)] text-[var(--muted)]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }}
            />
            {d.name}: <span className="tabular-nums text-[var(--text)]">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
