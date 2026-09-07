"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin/require-admin-session";
import {
  AdminServiceUnavailableError,
  createAdminServiceRoleContext,
} from "@/lib/admin/service-role-for-admin";
import {
  GIVEAWAY_CYCLE_DAYS,
  GIVEAWAY_PRIZES,
} from "@/lib/giveaway/constants";

type ActionResult = { ok: true } | { ok: false; error: string };

function actionError(err: unknown): { ok: false; error: string } {
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return { ok: false, error: message };
}

export type AdminGiveawayCycleRow = {
  id: string;
  entry_start: string;
  entry_end: string;
  status: "active" | "closed" | "completed";
  winners_announced_at: string | null;
  admin_notes: string | null;
  created_at: string;
  qualifying_count?: number;
};

export type AdminGiveawayWinnerInput = {
  displayName: string;
  prizeRank: number;
};

export async function adminListGiveawayCycles(): Promise<
  { ok: true; rows: AdminGiveawayCycleRow[] } | { ok: false; error: string }
> {
  try {
    const { supabase } = await requireAdminSession();
    const { data, error } = await supabase
      .from("giveaway_cycles")
      .select("id,entry_start,entry_end,status,winners_announced_at,admin_notes,created_at")
      .order("entry_start", { ascending: false })
      .limit(24);
    if (error) {
      return { ok: false, error: error.message };
    }

    const rows: AdminGiveawayCycleRow[] = [];
    for (const row of data ?? []) {
      const { data: count } = await supabase.rpc(
        "giveaway_qualifying_entrant_count",
        {
          p_entry_start: row.entry_start,
          p_entry_end: row.entry_end,
        },
      );
      rows.push({
        ...row,
        status: row.status as AdminGiveawayCycleRow["status"],
        qualifying_count: typeof count === "number" ? count : undefined,
      });
    }

    return { ok: true, rows };
  } catch (err) {
    if (err instanceof AdminServiceUnavailableError) {
      return { ok: false, error: err.message };
    }
    return actionError(err);
  }
}

export async function adminCreateGiveawayCycle(input: {
  entryStart: string;
  entryEnd?: string;
  adminNotes?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const start = input.entryStart.includes("T")
    ? new Date(input.entryStart)
    : new Date(`${input.entryStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "Enter a valid start date." };
  }

  let end: Date;
  if (input.entryEnd?.trim()) {
    end = input.entryEnd.includes("T")
      ? new Date(input.entryEnd)
      : new Date(`${input.entryEnd}T23:59:59.999Z`);
    if (Number.isNaN(end.getTime())) {
      return { ok: false, error: "Enter a valid end date." };
    }
  } else {
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + GIVEAWAY_CYCLE_DAYS);
    end.setUTCHours(23, 59, 59, 999);
  }

  if (end <= start) {
    return { ok: false, error: "End date must be after the start date." };
  }

  try {
    const { supabase, adminUserId } = await createAdminServiceRoleContext();

    const { data: existingActive } = await supabase
      .from("giveaway_cycles")
      .select("id")
      .eq("status", "active")
      .limit(1);
    if (existingActive?.length) {
      return {
        ok: false,
        error: "Close or complete the current active cycle before starting a new one.",
      };
    }

    const { data, error } = await supabase
      .from("giveaway_cycles")
      .insert({
        entry_start: start.toISOString(),
        entry_end: end.toISOString(),
        status: "active",
        admin_notes: input.adminNotes?.trim() || null,
        created_by: adminUserId,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/giveaway");
    return { ok: true, id: data.id };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminCloseGiveawayCycle(
  cycleId: string,
): Promise<ActionResult> {
  if (!cycleId.trim()) {
    return { ok: false, error: "Missing cycle." };
  }
  try {
    const { supabase } = await createAdminServiceRoleContext();
    const { error } = await supabase
      .from("giveaway_cycles")
      .update({ status: "closed" })
      .eq("id", cycleId)
      .eq("status", "active");
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin");
    revalidatePath("/giveaway");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function adminPublishGiveawayWinners(input: {
  cycleId: string;
  winners: AdminGiveawayWinnerInput[];
}): Promise<ActionResult> {
  if (!input.cycleId.trim()) {
    return { ok: false, error: "Missing cycle." };
  }
  if (input.winners.length !== GIVEAWAY_PRIZES.length) {
    return {
      ok: false,
      error: `Enter all ${GIVEAWAY_PRIZES.length} winner display names.`,
    };
  }

  const prizeByRank = new Map<number, number>(
    GIVEAWAY_PRIZES.map((p) => [p.rank, p.amountUsd]),
  );

  try {
    const { supabase, adminUserId } = await createAdminServiceRoleContext();

    const { data: cycle, error: fetchError } = await supabase
      .from("giveaway_cycles")
      .select("id,status")
      .eq("id", input.cycleId)
      .maybeSingle();
    if (fetchError) {
      return { ok: false, error: fetchError.message };
    }
    if (!cycle) {
      return { ok: false, error: "Cycle not found." };
    }
    if (cycle.status === "completed") {
      return { ok: false, error: "Winners were already published for this cycle." };
    }

    const rows = input.winners.map((w) => {
      const name = w.displayName.trim();
      if (!name) {
        throw new Error("Each winner needs a display name (e.g. Jamie R.).");
      }
      const usd = prizeByRank.get(w.prizeRank);
      if (usd == null) {
        throw new Error("Invalid prize rank.");
      }
      return {
        cycle_id: input.cycleId,
        display_name: name,
        prize_amount_cents: usd * 100,
        prize_rank: w.prizeRank,
        created_by: adminUserId,
      };
    });

    const { error: deleteError } = await supabase
      .from("giveaway_winners")
      .delete()
      .eq("cycle_id", input.cycleId);
    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    const { error: insertError } = await supabase
      .from("giveaway_winners")
      .insert(rows);
    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    const { error: updateError } = await supabase
      .from("giveaway_cycles")
      .update({
        status: "completed",
        winners_announced_at: new Date().toISOString(),
      })
      .eq("id", input.cycleId);
    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/giveaway");
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
