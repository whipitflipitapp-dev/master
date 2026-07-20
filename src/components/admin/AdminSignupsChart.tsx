"use client";

import type { AdminDayCountRow } from "@/lib/admin/metrics-types";

import { AdminDailyLineChart } from "@/components/admin/AdminDailyLineChart";

/** Signups over time (wrapper around shared daily line chart). */
export function AdminSignupsChart({ data }: { data: AdminDayCountRow[] }) {
  return (
    <AdminDailyLineChart
      data={data}
      seriesName="Signups"
      emptyMessage="No signup data in this window."
    />
  );
}
