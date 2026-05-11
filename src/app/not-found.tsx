import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-20 text-center">
      <h1 className="text-2xl font-bold text-[var(--text)]">Page not found</h1>
      <p className="text-sm text-[var(--muted)]">
        The recipe or page you opened does not exist.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
      >
        Home
      </Link>
    </div>
  );
}
