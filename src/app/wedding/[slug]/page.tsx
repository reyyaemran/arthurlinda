import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import {
  DEFAULT_TEMPLATE_ID,
  getInvitationTemplate,
} from "@/landing/templates/registry";
import { getDefaultPublicWedding } from "@/lib/wedding/bootstrap";
import {
  getWeddingBySlug,
  serializeWeddingForPublic,
} from "@/lib/wedding/queries";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ template?: string }>;
}

export default async function WeddingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { template } = await searchParams;

  const defaultData = getDefaultPublicWedding();

  // Only serve this route for the correct slug
  if (slug !== defaultData.slug) notFound();

  let data = defaultData;
  try {
    const wedding = await getWeddingBySlug(slug);
    if (wedding) data = serializeWeddingForPublic(wedding);
  } catch {
    // DB not yet configured — show default invitation
  }

  const Template = getInvitationTemplate(template ?? DEFAULT_TEMPLATE_ID);
  return <Template data={data} />;
}
