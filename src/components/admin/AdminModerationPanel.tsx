"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  adminAddBannedEmail,
  adminAddComplimentaryGrant,
  adminBanUser,
  adminListBannedEmails,
  adminListComplimentaryGrants,
  adminRemoveBannedEmail,
  adminRemoveComplimentaryGrant,
  adminSearchRecipes,
  adminSearchUsers,
  adminSetRecipeModeration,
  adminSetUserPlan,
  adminUnbanUser,
  type AdminRecipeRow,
  type AdminUserRow,
  type BannedEmailRow,
  type ComplimentaryGrantRow,
  type RecipeModerationStatus,
} from "@/app/actions/admin-moderation";
import { planTypeBadgeLabel, type PlanType } from "@/lib/plan";

type Tab = "users" | "recipes" | "emails" | "complimentary";

const PLAN_OPTIONS: PlanType[] = ["free", "pro", "ai_chef"];
const RECIPE_STATUS_OPTIONS: {
  value: "" | RecipeModerationStatus;
  label: string;
}[] = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "pending_review", label: "Pending review" },
  { value: "hidden", label: "Hidden" },
  { value: "removed", label: "Removed" },
];

export function AdminModerationPanel() {
  const [tab, setTab] = useState<Tab>("users");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);

  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeStatus, setRecipeStatus] = useState("");
  const [recipes, setRecipes] = useState<AdminRecipeRow[]>([]);

  const [bannedEmails, setBannedEmails] = useState<BannedEmailRow[]>([]);
  const [newBanEmail, setNewBanEmail] = useState("");
  const [newBanReason, setNewBanReason] = useState("");

  const [complimentaryGrants, setComplimentaryGrants] = useState<
    ComplimentaryGrantRow[]
  >([]);
  const [newGrantEmail, setNewGrantEmail] = useState("");
  const [newGrantPlan, setNewGrantPlan] = useState<PlanType>("pro");
  const [newGrantNote, setNewGrantNote] = useState("");

  const flash = useCallback((ok: boolean, text: string) => {
    if (ok) {
      setMessage(text);
      setError(null);
    } else {
      setError(text);
      setMessage(null);
    }
  }, []);

  const runUserSearch = () => {
    startTransition(async () => {
      const res = await adminSearchUsers(userQuery);
      if (!res.ok) {
        flash(false, res.error);
        return;
      }
      setUsers(res.rows);
      flash(true, `Found ${res.rows.length} user(s).`);
    });
  };

  const runRecipeSearch = () => {
    startTransition(async () => {
      const res = await adminSearchRecipes(recipeQuery, recipeStatus);
      if (!res.ok) {
        flash(false, res.error);
        return;
      }
      setRecipes(res.rows);
      flash(true, `Found ${res.rows.length} recipe(s).`);
    });
  };

  const loadBannedEmails = () => {
    startTransition(async () => {
      const res = await adminListBannedEmails();
      if (!res.ok) {
        flash(false, res.error);
        return;
      }
      setBannedEmails(res.rows);
    });
  };

  const loadComplimentaryGrants = () => {
    startTransition(async () => {
      const res = await adminListComplimentaryGrants();
      if (!res.ok) {
        flash(false, res.error);
        return;
      }
      setComplimentaryGrants(res.rows);
    });
  };

  const onTabChange = (next: Tab) => {
    setTab(next);
    setMessage(null);
    setError(null);
    if (next === "emails" && bannedEmails.length === 0) {
      loadBannedEmails();
    }
    if (next === "complimentary" && complimentaryGrants.length === 0) {
      loadComplimentaryGrants();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["users", "Users & plans"],
            ["recipes", "Recipes"],
            ["complimentary", "Complimentary invites"],
            ["emails", "Banned emails"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === key
                ? "border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--primary-muted)] text-[var(--primary-hover)]"
                : "border-[color-mix(in_srgb,var(--muted)_25%,transparent)] text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {tab === "users" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Search by email, display name, or user ID. Grant complimentary Pro / AI Chef
            access for chefs (Stripe will not overwrite complimentary plans). Ban accounts
            that abuse the platform.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search users…"
              className="min-w-[14rem] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            />
            <button
              type="button"
              disabled={pending}
              onClick={runUserSearch}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Search
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,var(--card))]">
            <table className="w-full min-w-[720px] border-collapse text-left text-[length:var(--text-caption)]">
              <thead className="border-b border-[color-mix(in_srgb,var(--muted)_28%,transparent)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">User</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted)]">
                      Run a search to manage users.
                    </td>
                  </tr>
                ) : (
                  users.map((row) => (
                    <UserRowActions
                      key={row.id}
                      row={row}
                      pending={pending}
                      onDone={(ok, text) => {
                        flash(ok, text);
                        if (ok) runUserSearch();
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "recipes" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Hide or remove recipes with dangerous or joke ingredients (for example non-food
            items or drugs). Removed recipes disappear from browse; owners still see their
            copy with moderation status.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={recipeQuery}
              onChange={(e) => setRecipeQuery(e.target.value)}
              placeholder="Search by title or recipe ID…"
              className="min-w-[12rem] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <select
              value={recipeStatus}
              onChange={(e) => setRecipeStatus(e.target.value)}
              className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              {RECIPE_STATUS_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={runRecipeSearch}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Search
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,var(--card))]">
            <table className="w-full min-w-[760px] border-collapse text-left text-[length:var(--text-caption)]">
              <thead className="border-b text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Recipe</th>
                  <th className="px-3 py-2 font-semibold">Creator</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Moderate</th>
                </tr>
              </thead>
              <tbody>
                {recipes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted)]">
                      Run a search to moderate recipes.
                    </td>
                  </tr>
                ) : (
                  recipes.map((row) => (
                    <RecipeRowActions
                      key={row.id}
                      row={row}
                      pending={pending}
                      onDone={(ok, text) => {
                        flash(ok, text);
                        if (ok) runRecipeSearch();
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "emails" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Block sign-in and sign-up for specific addresses (for example repeat abusers).
            Existing accounts with that email should also be banned from the Users tab.
          </p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await adminAddBannedEmail({
                  email: newBanEmail,
                  reason: newBanReason,
                });
                if (!res.ok) {
                  flash(false, res.error);
                  return;
                }
                setNewBanEmail("");
                setNewBanReason("");
                flash(true, "Email added to blocklist.");
                loadBannedEmails();
              });
            }}
          >
            <input
              type="email"
              required
              value={newBanEmail}
              onChange={(e) => setNewBanEmail(e.target.value)}
              placeholder="email@example.com"
              className="min-w-[14rem] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={newBanReason}
              onChange={(e) => setNewBanReason(e.target.value)}
              placeholder="Reason (optional)"
              className="min-w-[10rem] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Block email
            </button>
          </form>
          <ul className="divide-y divide-[color-mix(in_srgb,var(--muted)_22%,transparent)] rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,var(--card))] px-4 py-1 text-sm">
            {bannedEmails.length === 0 ? (
              <li className="py-4 text-center text-[var(--muted)]">
                No blocked emails yet.
              </li>
            ) : (
              bannedEmails.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--text)]">{row.email}</p>
                    {row.reason ? (
                      <p className="text-xs text-[var(--muted)]">{row.reason}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await adminRemoveBannedEmail(row.id);
                        flash(res.ok, res.ok ? "Removed from blocklist." : res.error);
                        if (res.ok) loadBannedEmails();
                      });
                    }}
                    className="text-xs font-semibold text-[var(--danger)] underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "complimentary" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Add a chef or partner email before they sign up. When they create an
            account with that address, they receive the plan below at no charge (
            <span className="text-[var(--text)]">complimentary</span> billing — Stripe
            will not overwrite it). If they already have an account, the plan applies
            immediately when you add the invite.
          </p>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await adminAddComplimentaryGrant({
                  email: newGrantEmail,
                  planType: newGrantPlan,
                  note: newGrantNote,
                });
                if (!res.ok) {
                  flash(false, res.error);
                  return;
                }
                setNewGrantEmail("");
                setNewGrantNote("");
                flash(
                  true,
                  res.appliedToExistingUser
                    ? "Invite added and plan applied to existing account."
                    : "Invite added — plan will apply when they sign up.",
                );
                loadComplimentaryGrants();
              });
            }}
          >
            <input
              type="email"
              required
              value={newGrantEmail}
              onChange={(e) => setNewGrantEmail(e.target.value)}
              placeholder="chef@example.com"
              className="min-w-[14rem] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <select
              value={newGrantPlan}
              onChange={(e) => setNewGrantPlan(e.target.value as PlanType)}
              className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              {PLAN_OPTIONS.filter((p) => p !== "free").map((p) => (
                <option key={p} value={p}>
                  {planTypeBadgeLabel(p)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newGrantNote}
              onChange={(e) => setNewGrantNote(e.target.value)}
              placeholder="Note (optional)"
              className="min-w-[10rem] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.99] disabled:opacity-60"
            >
              Add invite
            </button>
          </form>
          <ul className="divide-y divide-[color-mix(in_srgb,var(--muted)_22%,transparent)] rounded-2xl border border-[color-mix(in_srgb,var(--muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,var(--card))] px-4 py-1 text-sm">
            {complimentaryGrants.length === 0 ? (
              <li className="py-4 text-center text-[var(--muted)]">
                No complimentary invites yet.
              </li>
            ) : (
              complimentaryGrants.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      {row.email}{" "}
                      <span className="font-normal text-[var(--muted)]">
                        · {planTypeBadgeLabel(row.plan_type as PlanType)}
                      </span>
                    </p>
                    {row.note ? (
                      <p className="text-xs text-[var(--muted)]">{row.note}</p>
                    ) : null}
                    <p className="text-[10px] text-[var(--muted)]">
                      {row.redeemed_at
                        ? `Used ${new Date(row.redeemed_at).toLocaleDateString()}`
                        : "Waiting for sign-up"}
                    </p>
                  </div>
                  {!row.redeemed_at ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const res = await adminRemoveComplimentaryGrant(row.id);
                          flash(
                            res.ok,
                            res.ok ? "Invite removed." : res.error,
                          );
                          if (res.ok) loadComplimentaryGrants();
                        });
                      }}
                      className="text-xs font-semibold text-[var(--danger)] underline-offset-2 hover:underline disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function UserRowActions({
  row,
  pending,
  onDone,
}: {
  row: AdminUserRow;
  pending: boolean;
  onDone: (ok: boolean, text: string) => void;
}) {
  const [plan, setPlan] = useState<PlanType>(
    (row.plan_type as PlanType) || "free",
  );
  const [complimentary, setComplimentary] = useState(
    row.plan_billing_source === "complimentary",
  );
  const [banReason, setBanReason] = useState("");
  const [planSaveState, setPlanSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  useEffect(() => {
    if (planSaveState !== "saved") return;
    const timer = window.setTimeout(() => setPlanSaveState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [planSaveState]);

  const planBusy = pending || planSaveState === "saving";

  const savePlanLabel =
    planSaveState === "saving"
      ? "Saving…"
      : planSaveState === "saved"
        ? "Saved"
        : "Save plan";

  const savePlanButtonClass =
    planSaveState === "saved"
      ? "rounded-lg bg-[var(--success)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.08)] ring-2 ring-[color-mix(in_srgb,var(--success)_45%,transparent)] transition-[background-color,transform,box-shadow] duration-200"
      : planSaveState === "saving"
        ? "cursor-wait rounded-lg bg-[var(--primary)] px-2.5 py-1 text-[10px] font-semibold text-white opacity-80 shadow-sm transition-opacity duration-200 motion-safe:animate-pulse"
        : "rounded-lg bg-[var(--primary)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.08)] transition-[background-color,transform,box-shadow] duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-card)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-55";

  return (
    <tr className="border-b border-[color-mix(in_srgb,var(--muted)_15%,transparent)] last:border-b-0">
      <td className="px-3 py-2">
        <p className="font-medium text-[var(--text)]">{row.email}</p>
        <p className="text-[10px] text-[var(--muted)]">
          {row.display_name || "—"} · {row.id.slice(0, 8)}…
        </p>
      </td>
      <td className="px-3 py-2">
        <p className="font-medium">{planTypeBadgeLabel(row.plan_type as PlanType)}</p>
        <p className="text-[10px] text-[var(--muted)]">
          {row.plan_billing_source === "complimentary"
            ? "Complimentary"
            : "Self / Stripe"}
        </p>
      </td>
      <td className="px-3 py-2">
        {row.banned_at ? (
          <span className="font-semibold text-[var(--danger)]">Banned</span>
        ) : (
          <span className="text-[var(--muted)]">Active</span>
        )}
        {row.ban_reason ? (
          <p className="max-w-[10rem] truncate text-[10px] text-[var(--muted)]">
            {row.ban_reason}
          </p>
        ) : null}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanType)}
              className="rounded-lg border border-[color-mix(in_srgb,var(--muted)_28%,transparent)] bg-[var(--bg)] px-2 py-1 text-xs"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {planTypeBadgeLabel(p)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={complimentary}
                onChange={(e) => setComplimentary(e.target.checked)}
              />
              Complimentary
            </label>
            <button
              type="button"
              disabled={planBusy}
              aria-busy={planSaveState === "saving"}
              onClick={() => {
                setPlanSaveState("saving");
                void adminSetUserPlan({
                  userId: row.id,
                  planType: plan,
                  complimentary,
                }).then((res) => {
                  if (res.ok) {
                    setPlanSaveState("saved");
                    onDone(true, "Plan updated.");
                  } else {
                    setPlanSaveState("idle");
                    onDone(false, res.error);
                  }
                });
              }}
              className={savePlanButtonClass}
            >
              {savePlanLabel}
            </button>
          </div>
          {row.banned_at ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                void adminUnbanUser(row.id).then((res) =>
                  onDone(res.ok, res.ok ? "User unbanned." : res.error),
                );
              }}
              className="w-fit text-[10px] font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
            >
              Unban
            </button>
          ) : (
            <div className="flex flex-wrap gap-1">
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ban reason"
                className="min-w-[8rem] flex-1 rounded-lg border px-2 py-1 text-[10px]"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  void adminBanUser({ userId: row.id, reason: banReason }).then(
                    (res) =>
                      onDone(res.ok, res.ok ? "User banned." : res.error),
                  );
                }}
                className="rounded-lg border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] px-2 py-1 text-[10px] font-semibold text-[var(--danger)] disabled:opacity-60"
              >
                Ban
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function RecipeRowActions({
  row,
  pending,
  onDone,
}: {
  row: AdminRecipeRow;
  pending: boolean;
  onDone: (ok: boolean, text: string) => void;
}) {
  const [reason, setReason] = useState(row.moderation_reason ?? "");

  const apply = (status: RecipeModerationStatus) => {
    void adminSetRecipeModeration({
      recipeId: row.id,
      status,
      reason,
    }).then((res) =>
      onDone(
        res.ok,
        res.ok ? `Recipe marked ${status}.` : res.error,
      ),
    );
  };

  return (
    <tr className="border-b border-[color-mix(in_srgb,var(--muted)_15%,transparent)] last:border-b-0">
      <td className="px-3 py-2">
        <Link
          href={`/recipes/${row.id}`}
          className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
        >
          {row.title}
        </Link>
        <p className="text-[10px] text-[var(--muted)]">{row.id.slice(0, 8)}…</p>
      </td>
      <td className="px-3 py-2 text-[var(--muted)]">
        {row.creator_email ?? row.created_by?.slice(0, 8) ?? "—"}
      </td>
      <td className="px-3 py-2 capitalize text-[var(--text)]">
        {row.moderation_status}
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Moderation note"
          className="mb-1 w-full min-w-[10rem] rounded-lg border px-2 py-1 text-[10px]"
        />
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => apply("pending_review")}
            className="rounded-lg border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-60"
          >
            Hold review
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => apply("published")}
            className="rounded-lg border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-60"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => apply("hidden")}
            className="rounded-lg border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-60"
          >
            Hide
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => apply("removed")}
            className="rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--danger)] disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
