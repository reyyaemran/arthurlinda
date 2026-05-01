/**
 * Invitation template 1 — default wedding landing.
 * Cream/rose design with squiggly timeline, horizontal story gallery, minimal map.
 */
import type { PublicWeddingPayload } from "@/lib/wedding/queries";

import { WeddingLanding } from "../wedding-landing";

export function Template1Landing({ data }: { data: PublicWeddingPayload }) {
  return <WeddingLanding data={data} />;
}
