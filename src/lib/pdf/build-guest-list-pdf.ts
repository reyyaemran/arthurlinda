import { format } from "date-fns";
import type { Guest, Wedding } from "@/types/wedding";
import { PDF_RSVP_STATUS } from "@/lib/pdf/wedding-pdf-labels";
import { PdfPageStream, approxCenterX, assembleMultiPagePdf } from "@/lib/pdf/raw-pdf";

function trunc(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t || "—";
  return `${t.slice(0, max - 1)}…`;
}

const W = 842;
const H = 595;
const M = 40;

export function buildGuestListPdf(input: { wedding: Wedding; guests: Guest[] }): Uint8Array {
  const { wedding, guests } = input;
  const couple = `${wedding.groomName} & ${wedding.brideName}`;
  const eventLine = wedding.eventDate
    ? format(new Date(wedding.eventDate), "MMMM d, yyyy")
    : "";

  // Compact columns aligned with requested export:
  // name, phone, email, status, pax, notes, date.
  const col = {
    name: 130,
    phone: 88,
    email: 154,
    status: 68,
    pax: 30,
    notes: 194,
    date: 98,
  };
  const colOrder = ["name", "phone", "email", "status", "pax", "notes", "date"] as const;
  const labels: Record<(typeof colOrder)[number], string> = {
    name: "Name",
    phone: "Phone",
    email: "Email",
    status: "Status",
    pax: "Pax",
    notes: "Notes",
    date: "Date",
  };

  const usableW = W - M * 2;
  const rowH = 13;
  const headH = 15;

  const pageStreams: string[] = [];
  let s = new PdfPageStream(H);

  function drawHeader(stream: PdfPageStream, headerTop: number): number {
    stream.fillRect(M, headerTop, usableW, headH, 0.96);
    stream.strokeHLine(M, M + usableW, headerTop + headH, 0.55, 0.4);
    let x = M + 4;
    for (const key of colOrder) {
      stream.text(x, headerTop + 11, 8, true, labels[key]);
      x += col[key];
      // subtle vertical separator between columns
      if (key !== colOrder[colOrder.length - 1]) {
        stream.strokeVLine(x - 2, headerTop + 1.5, headerTop + headH - 1.5, 0.78, 0.25);
      }
    }
    return headerTop + headH;
  }

  const title = "Guest list";
  s.text(approxCenterX(W, title, 16, true), M + 10, 16, true, title);
  const sub = [couple, eventLine].filter(Boolean).join(" · ");
  if (sub) s.text(approxCenterX(W, sub, 9, false), M + 28, 9, false, sub);

  let yRow = drawHeader(s, M + 40);

  for (const g of guests) {
    if (yRow + rowH > H - M - 22) {
      pageStreams.push(s.toString());
      s = new PdfPageStream(H);
      yRow = drawHeader(s, M);
    }

    const dateText = g.createdAt
      ? format(new Date(g.createdAt), "MMM d, yyyy HH:mm")
      : "—";
    const pax = g.rsvpStatus === "CONFIRMED" ? g.confirmedPax : g.invitedPax;
    const cells: Record<(typeof colOrder)[number], string> = {
      name: trunc(g.name, 34),
      phone: trunc(g.phone || "—", 22),
      email: trunc(g.email || "—", 32),
      status: PDF_RSVP_STATUS[g.rsvpStatus],
      pax: pax > 0 ? String(pax) : "—",
      notes: trunc(g.notes || "—", 48),
      date: trunc(dateText, 22),
    };

    let x = M + 4;
    for (const key of colOrder) {
      s.text(x, yRow + 11, 7, false, cells[key]);
      x += col[key];
      if (key !== colOrder[colOrder.length - 1]) {
        s.strokeVLine(x - 2, yRow + 1, yRow + rowH - 1, 0.86, 0.2);
      }
    }
    s.strokeHLine(M, M + usableW, yRow + rowH, 0.75, 0.35);
    yRow += rowH;
  }

  const foot = `${guests.length} guest${guests.length === 1 ? "" : "s"} · exported ${format(new Date(), "yyyy-MM-dd HH:mm")}`;
  s.text(approxCenterX(W, foot, 8, false), H - M - 6, 8, false, foot);

  pageStreams.push(s.toString());

  return assembleMultiPagePdf(pageStreams.map((stream) => ({ width: W, height: H, stream })));
}
