import { requireAdminSession } from "@/lib/admin/require-admin-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex flex-1 flex-col bg-[var(--bg)]">
      <div className="border-b border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Admin
        </p>
        <h1 className="text-lg font-bold text-[var(--text)]">Operations</h1>
      </div>
      {children}
    </div>
  );
}
