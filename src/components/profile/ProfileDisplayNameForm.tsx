"use client";

import { useActionState } from "react";

import { updateDisplayName } from "@/app/actions/profile";

export function ProfileDisplayNameForm({
  defaultName,
}: {
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, fd: FormData) =>
      updateDisplayName(fd),
    { error: null as string | null },
  );

  return (
    <form className="mt-4 flex flex-col gap-2" action={formAction}>
      <label
        htmlFor="display_name"
        className="text-[length:var(--text-meta)] font-medium text-[var(--text)]"
      >
        Display name
      </label>
      <input
        id="display_name"
        name="display_name"
        type="text"
        autoComplete="nickname"
        maxLength={80}
        defaultValue={defaultName}
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[var(--shadow-card)] outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
      />
      {state.error ? (
        <p className="text-xs font-medium text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
