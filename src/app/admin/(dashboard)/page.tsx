import { redirect } from "next/navigation";

import { OverviewPage } from "@/dashboard/pages/overview";
import { getSession } from "@/lib/auth/session";
import { getOverviewStats, getWeddingForUser } from "@/lib/wedding/queries";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) redirect("/admin/login");

  const stats = await getOverviewStats(wedding.id);

  return <OverviewPage stats={stats} currency={wedding.currency} />;
}
