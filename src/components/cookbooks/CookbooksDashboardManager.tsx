"use client";

import { useActionState } from "react";

import {
  createCookbook,
  deleteCookbook,
  updateCookbook,
} from "@/app/actions/cookbooks";
import { getAmazonAffiliateHostAllowlist } from "@/lib/amazon-affiliate-url";

const AFFILIATE_HOSTS_HINT_ID = "amazon-affiliate-hosts-hint";

export type CookbookRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  external_link: string | null;
};

function fieldHint() {
  const hosts = getAmazonAffiliateHostAllowlist();
  return (
    <p className="mt-1 text-[length:var(--text-caption)] text-[var(--muted)]">
      Allowed Amazon hosts include:{" "}
      <span id={AFFILIATE_HOSTS_HINT_ID} className="break-words font-mono text-[length:var(--text-caption)]">
        {hosts.slice(0, 8).join(", ")}
        {hosts.length > 8 ? ", …" : ""}
      </span>
      . Add more via{" "}
      <code className="rounded bg-[color-mix(in_srgb,var(--muted)_14%,transparent)] px-1">
        NEXT_PUBLIC_AMAZON_AFFILIATE_HOST_ALLOWLIST
      </code>
      .
    </p>
  );
}

export function CookbooksDashboardManager({
  cookbooks,
}: {
  cookbooks: CookbookRow[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createCookbook,
    { error: null as string | null },
  );

  return (
    <div className="space-y-8">
      <section
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="add-cookbook-heading"
      >
        <h2
          id="add-cookbook-heading"
          className="text-lg font-semibold text-[var(--text)]"
        >
          Add cookbook link
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Paste an Amazon or Kindle affiliate product URL and an optional cover image (HTTPS).
        </p>

        <form action={createAction} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="cb-title"
              className="block text-sm font-semibold text-[var(--text)]"
            >
              Title
            </label>
            <input
              id="cb-title"
              name="title"
              required
              maxLength={200}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)]"
              placeholder="e.g. My regional baking book"
            />
          </div>
          <div>
            <label
              htmlFor="cb-affiliate"
              className="block text-sm font-semibold text-[var(--text)]"
            >
              Affiliate product URL
            </label>
            <input
              id="cb-affiliate"
              name="affiliate_url"
              type="url"
              required
              maxLength={2048}
              inputMode="url"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)]"
              placeholder="https://www.amazon.com/dp/… or https://amzn.to/…"
              aria-describedby={AFFILIATE_HOSTS_HINT_ID}
            />
            {fieldHint()}
          </div>
          <div>
            <label
              htmlFor="cb-cover"
              className="block text-sm font-semibold text-[var(--text)]"
            >
              Cover image URL (optional)
            </label>
            <input
              id="cb-cover"
              name="cover_image_url"
              type="url"
              maxLength={2048}
              inputMode="url"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)]"
              placeholder="https://…"
            />
            <p className="mt-1 text-[length:var(--text-caption)] text-[var(--muted)]">
              Must be HTTPS. Any image host is fine.
            </p>
          </div>
          <div>
            <label
              htmlFor="cb-note"
              className="block text-sm font-semibold text-[var(--text)]"
            >
              Note (optional)
            </label>
            <textarea
              id="cb-note"
              name="note"
              rows={3}
              maxLength={2000}
              className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)]"
              placeholder="Short blurb shown on your chef page."
            />
          </div>

          {createState.error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {createState.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={createPending}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {createPending ? "Saving…" : "Add cookbook"}
          </button>
        </form>
      </section>

      <section aria-labelledby="your-cookbooks-heading">
        <h2
          id="your-cookbooks-heading"
          className="text-lg font-semibold text-[var(--text)]"
        >
          Your cookbooks
        </h2>
        {cookbooks.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            No cookbook links yet. Add one above to show it on your public chef page.
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {cookbooks.map((row) => (
              <CookbookEditorRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CookbookEditorRow({ row }: { row: CookbookRow }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCookbook,
    { error: null as string | null },
  );

  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
      <form action={updateAction} className="space-y-4">
        <input type="hidden" name="id" value={row.id} />
        <div>
          <label className="block text-sm font-semibold text-[var(--text)]">
            Title
          </label>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={row.title}
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--text)]">
            Affiliate product URL
          </label>
          <input
            name="affiliate_url"
            type="url"
            required
            maxLength={2048}
            defaultValue={row.external_link ?? ""}
            aria-describedby={AFFILIATE_HOSTS_HINT_ID}
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--text)]">
            Cover image URL (optional)
          </label>
          <input
            name="cover_image_url"
            type="url"
            maxLength={2048}
            defaultValue={row.cover_image_url ?? ""}
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--text)]">
            Note (optional)
          </label>
          <textarea
            name="note"
            rows={2}
            maxLength={2000}
            defaultValue={row.description ?? ""}
            className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
          />
        </div>

        {updateState.error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {updateState.error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={updatePending}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {updatePending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <form
        action={deleteCookbook}
        className="mt-4 border-t border-[var(--border)] pt-4"
      >
        <input type="hidden" name="id" value={row.id} />
        <button
          type="submit"
          className="text-sm font-semibold text-[var(--danger)] underline-offset-4 hover:underline"
        >
          Remove cookbook
        </button>
      </form>
    </li>
  );
}
