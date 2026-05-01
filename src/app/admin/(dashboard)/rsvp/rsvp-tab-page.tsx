import { redirect } from "next/navigation";

import { GuestRsvpPage } from "@/dashboard/pages/guest-rsvp";
import { getSession } from "@/lib/auth/session";
import {
  getWeddingForUser,
  listGuestsViewModels,
  listRsvpsViewModels,
} from "@/lib/wedding/queries";
import type { RsvpStatus } from "@/types/wedding";

export async function RsvpTabPage({
  filterStatus,
}: {
  filterStatus?: RsvpStatus;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) redirect("/admin/login");

  const [guests, rsvps] = await Promise.all([
    listGuestsViewModels(wedding.id),
    listRsvpsViewModels(wedding.id),
  ]);

  return (
    <GuestRsvpPage
      initialGuests={guests}
      initialRsvps={rsvps}
      defaultTab="rsvp"
      filterStatus={filterStatus}
      groomName={wedding.groomName}
      brideName={wedding.brideName}
    />
  );
}
