import { getSession } from "@/lib/auth/session";
import { buildRsvpListPdf } from "@/lib/pdf/build-rsvp-list-pdf";
import { getWeddingForUser, listRsvpsViewModels } from "@/lib/wedding/queries";
import type { Wedding } from "@/types/wedding";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const weddingRow = await getWeddingForUser(session.user.id);
  if (!weddingRow) return new Response("Not found", { status: 404 });

  const rsvps = await listRsvpsViewModels(weddingRow.id);
  const wedding = weddingRow as unknown as Wedding;
  const bytes = buildRsvpListPdf({ wedding, rsvps });

  const filename = `rsvp-list-${weddingRow.slug.replace(/[^a-z0-9-_]+/gi, "-")}.pdf`;
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
