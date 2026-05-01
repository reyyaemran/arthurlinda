import { redirect } from "next/navigation";

import { GuestRsvpPage } from "@/dashboard/pages/guest-rsvp";
import { getSession } from "@/lib/auth/session";
import {
  listGuestsViewModels,
  listRsvpsViewModels,
  getWeddingForUser,
} from "@/lib/wedding/queries";

export default async function AdminGuestsPage() {
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
      defaultTab="guests"
      groomName={wedding.groomName}
      brideName={wedding.brideName}
    />
  );
}
