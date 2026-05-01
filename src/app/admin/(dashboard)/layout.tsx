import { redirect } from "next/navigation";

import DashboardLayoutWrapper from "@/dashboard/components/dashboard-layout";
import { getSession } from "@/lib/auth/session";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <DashboardLayoutWrapper user={session.user}>{children}</DashboardLayoutWrapper>
  );
}
