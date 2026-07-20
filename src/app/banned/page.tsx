import Link from "next/link";

export const metadata = {
  title: "Account restricted | Whip It Flip It",
  robots: { index: false, follow: false },
};

export default function BannedPage() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center px-5 py-16 text-center">
      <h1 className="text-xl font-bold text-[var(--text)]">Account restricted</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        This account or email address is not allowed to use Whip It Flip It. If you
        believe this is a mistake, contact support at{" "}
        <a
          href="mailto:whipitflipitapp@gmail.com"
          className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
        >
          whipitflipitapp@gmail.com
        </a>
        .
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </main>
  );
}
