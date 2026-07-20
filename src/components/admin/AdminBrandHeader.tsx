import Image from "next/image";
import Link from "next/link";

export function AdminBrandHeader() {
  return (
    <header className="border-b border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_8%,var(--bg)),var(--bg))] pb-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        >
          <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--card)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
            <Image
              src="/images/upgrade-pitch-logo.png"
              alt="Whip It Flip It"
              width={44}
              height={44}
              className="h-full w-full object-contain p-0.5"
              priority
            />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold tracking-tight text-[var(--text)]">
              Whip It Flip It
            </span>
            <span className="block text-xs font-semibold text-[var(--primary)]">
              Business command center
            </span>
          </span>
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          <Link
            href="/profile"
            className="font-semibold text-[var(--muted)] underline-offset-4 hover:text-[var(--primary)] hover:underline"
          >
            Profile
          </Link>
          <span className="hidden h-3 w-px bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] sm:block" />
          <span className="rounded-full bg-[var(--primary-muted)] px-2.5 py-0.5 font-semibold uppercase tracking-wide text-[var(--primary-hover)]">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}
