import { redirect } from "next/navigation";

import { AccountSettingsClient } from "./account-settings-client";
import { getSession } from "@/lib/auth/session";
import {
  getWeddingWithEventsForUser,
  serializeWeddingForPublic,
} from "@/lib/wedding/queries";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AccountSettingsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const row = await getWeddingWithEventsForUser(session.user.id);
  if (!row) redirect("/admin/login");

  const weddingData = serializeWeddingForPublic(row);
  const { tab } = await searchParams;
  const defaultTab = tab === "wedding" ? "wedding" : "account";

  return (
    <AccountSettingsClient
      weddingData={weddingData}
      userName={session.user.name}
      userEmail={session.user.email}
      userPhone={session.user.phone}
      defaultTab={defaultTab}
    />
  );
}
