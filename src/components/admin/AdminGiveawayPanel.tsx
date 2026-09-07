"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  adminCloseGiveawayCycle,
  adminCreateGiveawayCycle,
  adminListGiveawayCycles,
  adminPublishGiveawayWinners,
  type AdminGiveawayCycleRow,
} from "@/app/actions/admin-giveaway";
import { GIVEAWAY_CYCLE_DAYS, GIVEAWAY_PRIZES } from "@/lib/giveaway/constants";

function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AdminGiveawayPanel() {
  const [rows, setRows] = useState<AdminGiveawayCycleRow[]>([]);
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [winnerCycleId, setWinnerCycleId] = useState("");
  const [winnerNames, setWinnerNames] = useState<string[]>(
    GIVEAWAY_PRIZES.map(() => ""),
  );

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await adminListGiveawayCycles();
      if (!res.ok) {
        setFlash({ ok: false, message: res.error });
        return;
      }
      setRows(res.rows);
      const publishable =
        res.rows.find((r) => r.status === "closed" || r.status === "active") ??
        res.rows[0];
      if (publishable) {
        setWinnerCycleId((prev) => prev || publishable.id);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {flash ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            flash.ok
              ? "border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--text)]"
              : "border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]"
          }`}
          role="status"
        >
          {flash.message}
        </p>
      ) : null}

      <p className="text-sm text-[var(--muted)]">
        Manage 60-day recipe giveaway cycles. The public{" "}
        <a
          href="/giveaway"
          className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
        >
          /giveaway
        </a>{" "}
        page reads dates, entrant counts, and published winners from here.
      </p>

      <form
        className="rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[var(--card)] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await adminCreateGiveawayCycle({
              entryStart: startDate,
              entryEnd: endDate || undefined,
              adminNotes: notes,
            });
            setFlash(
              res.ok
                ? { ok: true, message: "New giveaway cycle created." }
                : { ok: false, message: res.error },
            );
            if (res.ok) {
              setStartDate("");
              setEndDate("");
              setNotes("");
              load();
            }
          });
        }}
      >
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Start a new cycle
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          End date defaults to {GIVEAWAY_CYCLE_DAYS} days after start. Only one
          active cycle at a time.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-[var(--muted)]">
            Entry start (UTC)
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-[var(--muted)]">
            Entry end (UTC, optional)
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
        </div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Admin notes (optional)"
          className="mt-2 w-full rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          Create cycle
        </button>
      </form>

      <ul className="divide-y divide-[color-mix(in_srgb,var(--muted)_22%,transparent)] rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,var(--card))] px-4 py-1 text-sm">
        {rows.length === 0 ? (
          <li className="py-4 text-center text-[var(--muted)]">
            No giveaway cycles yet.
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-medium text-[var(--text)]">
                  {formatUtcDate(row.entry_start)} →{" "}
                  {formatUtcDate(row.entry_end)}
                  <span className="ml-2 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                    {row.status}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Qualifying entrants: {row.qualifying_count ?? "—"}
                  {row.winners_announced_at
                    ? ` · Winners announced ${formatUtcDate(row.winners_announced_at)}`
                    : null}
                </p>
              </div>
              {row.status === "active" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await adminCloseGiveawayCycle(row.id);
                      setFlash(
                        res.ok
                          ? { ok: true, message: "Cycle closed for drawing." }
                          : { ok: false, message: res.error },
                      );
                      if (res.ok) load();
                    });
                  }}
                  className="text-xs font-semibold text-[var(--primary)] underline-offset-2 hover:underline disabled:opacity-60"
                >
                  Close cycle
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <form
        className="rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[var(--card)] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await adminPublishGiveawayWinners({
              cycleId: winnerCycleId,
              winners: GIVEAWAY_PRIZES.map((p, i) => ({
                prizeRank: p.rank,
                displayName: winnerNames[i] ?? "",
              })),
            });
            setFlash(
              res.ok
                ? { ok: true, message: "Winners published on /giveaway." }
                : { ok: false, message: res.error },
            );
            if (res.ok) {
              setWinnerNames(GIVEAWAY_PRIZES.map(() => ""));
              load();
            }
          });
        }}
      >
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Publish winners
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          First name + last initial only (e.g. Jamie R.). Marks the cycle
          completed.
        </p>
        <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Cycle
          <select
            value={winnerCycleId}
            onChange={(e) => setWinnerCycleId(e.target.value)}
            className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="">Select cycle…</option>
            {rows
              .filter((r) => r.status !== "completed")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {formatUtcDate(r.entry_start)} → {formatUtcDate(r.entry_end)} (
                  {r.status})
                </option>
              ))}
          </select>
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {GIVEAWAY_PRIZES.map((prize, i) => (
            <label
              key={prize.rank}
              className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]"
            >
              ${prize.amountUsd} — {prize.label}
              <input
                type="text"
                required
                value={winnerNames[i] ?? ""}
                onChange={(e) => {
                  const next = [...winnerNames];
                  next[i] = e.target.value;
                  setWinnerNames(next);
                }}
                placeholder="Jamie R."
                className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={pending || !winnerCycleId}
          className="mt-3 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          Publish winners
        </button>
      </form>
    </div>
  );
}
