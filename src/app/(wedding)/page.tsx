import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import { Template1Landing } from "@/landing/templates/template-1";
import { getDefaultPublicWedding } from "@/lib/wedding/bootstrap";
import {
  getSingletonWeddingWithEvents,
  serializeWeddingForPublic,
} from "@/lib/wedding/queries";

export const metadata: Metadata = {
  title: "Arthur & Linda — Celebration in Siem Reap",
  description:
    "Celebration of Arthur & Linda — November 7, 2026 in Siem Reap. Nature-inspired ceremony and reception at Angkor Grace.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  let data = getDefaultPublicWedding();
  try {
    const wedding = await getSingletonWeddingWithEvents();
    if (wedding) data = serializeWeddingForPublic(wedding);
  } catch {
    // DB not yet configured — show default invitation
  }
  return <Template1Landing data={data} />;
}
