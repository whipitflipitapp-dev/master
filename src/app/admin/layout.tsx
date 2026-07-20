import { AdminBrandHeader } from "@/components/admin/AdminBrandHeader";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { requireAdminSession } from "@/lib/admin/require-admin-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex flex-1 flex-col bg-[var(--bg)]">
      <div className="sticky top-0 z-30 shadow-[0_1px_0_color-mix(in_srgb,var(--muted)_20%,transparent)]">
        <AdminBrandHeader />
        <AdminSectionNav />
      </div>
      {children}
    </div>
  );
}
