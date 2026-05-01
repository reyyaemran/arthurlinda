import { redirect } from "next/navigation";

import { TimelinePage } from "@/dashboard/pages/timeline";
import { getSession } from "@/lib/auth/session";
import { getWeddingForUser, listTimelineTasksViewModels } from "@/lib/wedding/queries";

export default async function AdminTimelinePage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) redirect("/admin/login");

  const tasks = await listTimelineTasksViewModels(wedding.id);

  return <TimelinePage initialTasks={tasks} />;
}
