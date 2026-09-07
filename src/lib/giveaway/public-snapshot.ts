import "server-only";

import {
  GIVEAWAY_PRIZES,
  GIVEAWAY_PRIZE_POOL_USD,
} from "@/lib/giveaway/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GiveawayWinnerPublic = {
  displayName: string;
  prizeAmountUsd: number;
  prizeRank: number;
};

export type GiveawayCyclePublic = {
  id: string;
  entryStart: string;
  entryEnd: string;
  status: "active" | "closed" | "completed";
  daysLeft: number | null;
  qualifyingEntrantCount: number | null;
  winners: GiveawayWinnerPublic[];
};

export type GiveawayPublicSnapshot = {
  prizePoolUsd: number;
  prizes: typeof GIVEAWAY_PRIZES;
  currentCycle: GiveawayCyclePublic | null;
  previousCycleWinners: GiveawayWinnerPublic[];
  previousCycleLabel: string | null;
  entrantCountUpdatedAt: string | null;
};

function daysUntil(endIso: string, now = new Date()): number {
  const end = new Date(endIso);
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatCycleLabel(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };
  const start = new Date(startIso).toLocaleDateString("en-US", opts);
  const end = new Date(endIso).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

export async function fetchGiveawayPublicSnapshot(): Promise<GiveawayPublicSnapshot> {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const empty: GiveawayPublicSnapshot = {
    prizePoolUsd: GIVEAWAY_PRIZE_POOL_USD,
    prizes: GIVEAWAY_PRIZES,
    currentCycle: null,
    previousCycleWinners: [],
    previousCycleLabel: null,
    entrantCountUpdatedAt: null,
  };

  if (!supabase) {
    return empty;
  }

  const { data: cycles, error: cyclesError } = await supabase
    .from("giveaway_cycles")
    .select("id,entry_start,entry_end,status,winners_announced_at")
    .in("status", ["active", "closed", "completed"])
    .order("entry_start", { ascending: false })
    .limit(12);

  if (cyclesError || !cycles?.length) {
    return empty;
  }

  const active =
    cycles.find(
      (c) =>
        c.status === "active" &&
        c.entry_start <= nowIso &&
        c.entry_end >= nowIso,
    ) ??
    cycles.find((c) => c.status === "active") ??
    null;

  let qualifyingEntrantCount: number | null = null;
  if (active) {
    const { data: count } = await supabase.rpc("giveaway_qualifying_entrant_count", {
      p_entry_start: active.entry_start,
      p_entry_end: active.entry_end,
    });
    if (typeof count === "number") {
      qualifyingEntrantCount = count;
    }
  }

  const previousCompleted = cycles.find(
    (c) => c.status === "completed" && c.id !== active?.id,
  );

  let previousCycleWinners: GiveawayWinnerPublic[] = [];
  let previousCycleLabel: string | null = null;

  if (previousCompleted) {
    previousCycleLabel = formatCycleLabel(
      previousCompleted.entry_start,
      previousCompleted.entry_end,
    );
    const { data: winners } = await supabase
      .from("giveaway_winners")
      .select("display_name,prize_amount_cents,prize_rank")
      .eq("cycle_id", previousCompleted.id)
      .order("prize_rank", { ascending: true });
    previousCycleWinners =
      winners?.map((w) => ({
        displayName: w.display_name,
        prizeAmountUsd: Math.round(w.prize_amount_cents / 100),
        prizeRank: w.prize_rank,
      })) ?? [];
  }

  let currentWinners: GiveawayWinnerPublic[] = [];
  if (active?.status === "completed") {
    const { data: winners } = await supabase
      .from("giveaway_winners")
      .select("display_name,prize_amount_cents,prize_rank")
      .eq("cycle_id", active.id)
      .order("prize_rank", { ascending: true });
    currentWinners =
      winners?.map((w) => ({
        displayName: w.display_name,
        prizeAmountUsd: Math.round(w.prize_amount_cents / 100),
        prizeRank: w.prize_rank,
      })) ?? [];
  }

  const currentCycle: GiveawayCyclePublic | null = active
    ? {
        id: active.id,
        entryStart: active.entry_start,
        entryEnd: active.entry_end,
        status: active.status as GiveawayCyclePublic["status"],
        daysLeft:
          active.status === "active" && active.entry_end >= nowIso
            ? daysUntil(active.entry_end)
            : null,
        qualifyingEntrantCount,
        winners: currentWinners,
      }
    : null;

  return {
    prizePoolUsd: GIVEAWAY_PRIZE_POOL_USD,
    prizes: GIVEAWAY_PRIZES,
    currentCycle,
    previousCycleWinners,
    previousCycleLabel,
    entrantCountUpdatedAt: qualifyingEntrantCount != null ? nowIso : null,
  };
}
