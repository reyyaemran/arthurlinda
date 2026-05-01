import type { ComponentType } from "react";

import type { PublicWeddingPayload } from "@/lib/wedding/queries";

import { Template1Landing } from "./template-1";
import { Template2Landing } from "./template-2";

export const INVITATION_TEMPLATE_IDS = [1, 2] as const;
export type InvitationTemplateId = (typeof INVITATION_TEMPLATE_IDS)[number];

export type InvitationTemplateProps = { data: PublicWeddingPayload };

export const INVITATION_TEMPLATES: Record<
  InvitationTemplateId,
  ComponentType<InvitationTemplateProps>
> = {
  1: Template1Landing,
  2: Template2Landing,
};

export const DEFAULT_TEMPLATE_ID: InvitationTemplateId = 1;

/** Resolve template by id; safe to call from server. */
export function getInvitationTemplate(id: number | string | null | undefined) {
  const n = id != null ? Number(id) : NaN;
  if (
    Number.isInteger(n) &&
    n >= 1 &&
    (INVITATION_TEMPLATE_IDS as readonly number[]).includes(n)
  ) {
    return INVITATION_TEMPLATES[n as InvitationTemplateId];
  }
  return INVITATION_TEMPLATES[DEFAULT_TEMPLATE_ID];
}
