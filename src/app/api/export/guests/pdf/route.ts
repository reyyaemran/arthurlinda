import { getSession } from "@/lib/auth/session";
import { buildGuestListPdf } from "@/lib/pdf/build-guest-list-pdf";
import { getWeddingForUser, listGuestsViewModels } from "@/lib/wedding/queries";
import type { Wedding } from "@/types/wedding";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const weddingRow = await getWeddingForUser(session.user.id);
  if (!weddingRow) return new Response("Not found", { status: 404 });

  const guests = await listGuestsViewModels(weddingRow.id);
  const wedding = weddingRow as unknown as Wedding;
  const bytes = buildGuestListPdf({ wedding, guests });

  const filename = `guest-list-${weddingRow.slug.replace(/[^a-z0-9-_]+/gi, "-")}.pdf`;
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
