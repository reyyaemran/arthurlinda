/**
 * Minimal PDF 1.4 with built-in Helvetica / Helvetica-Bold (no npm pdf-lib).
 * Text positioning uses PDF user space: origin bottom-left, y increases upward.
 */

function escapePdfText(s: string): string {
  return Array.from(s)
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code > 126 || code < 32) return "?";
      if (c === "\\") return "\\\\";
      if (c === "(") return "\\(";
      if (c === ")") return "\\)";
      return c;
    })
    .join("");
}

/** yFromTop = distance from top edge of page downward */
export function yFromTopToPdf(pageH: number, yFromTop: number): number {
  return pageH - yFromTop;
}

export class PdfPageStream {
  private parts: string[] = [];
  private readonly pageH: number;

  constructor(pageHeight: number) {
    this.pageH = pageHeight;
  }

  /** Gray fill 0=black 1=white */
  fillRect(x: number, yFromTop: number, w: number, h: number, gray: number): void {
    const yBottom = this.pageH - yFromTop - h;
    this.parts.push(`${gray.toFixed(3)} g\n${fmt(x)} ${fmt(yBottom)} ${fmt(w)} ${fmt(h)} re f\n`);
  }

  /** Horizontal line; yFromTop is line position from top of page */
  strokeHLine(x1: number, x2: number, yFromTop: number, gray: number, lineW: number): void {
    const y = yFromTopToPdf(this.pageH, yFromTop);
    this.parts.push(
      `${lineW} w\n${gray.toFixed(3)} G\n${fmt(x1)} ${fmt(y)} m ${fmt(x2)} ${fmt(y)} l S\n`,
    );
  }

  /** Vertical line; yTopFromTop/yBottomFromTop are distances from page top. */
  strokeVLine(
    x: number,
    yTopFromTop: number,
    yBottomFromTop: number,
    gray: number,
    lineW: number,
  ): void {
    const yTop = yFromTopToPdf(this.pageH, yTopFromTop);
    const yBottom = yFromTopToPdf(this.pageH, yBottomFromTop);
    this.parts.push(
      `${lineW} w\n${gray.toFixed(3)} G\n${fmt(x)} ${fmt(yTop)} m ${fmt(x)} ${fmt(yBottom)} l S\n`,
    );
  }

  /** Baseline position: yFromTop from top to baseline */
  text(x: number, yFromTop: number, size: number, bold: boolean, content: string): void {
    const font = bold ? "/F2" : "/F1";
    const y = yFromTopToPdf(this.pageH, yFromTop);
    const t = escapePdfText(content);
    // Force text fill/stroke to black so table headers stay readable even after
    // gray fills (rectangles) change the graphics state.
    this.parts.push(
      `0 g\n0 G\nBT\n${font} ${fmt(size)} Tf\n1 0 0 1 ${fmt(x)} ${fmt(y)} Tm\n(${t}) Tj\nET\n`,
    );
  }

  toString(): string {
    return this.parts.join("");
  }
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Approximate centered x for Helvetica (rough width) */
export function approxCenterX(pageW: number, text: string, fontSize: number, bold: boolean): number {
  const factor = bold ? 0.55 : 0.52;
  const tw = text.length * fontSize * factor;
  return Math.max(40, (pageW - tw) / 2);
}

export function assembleMultiPagePdf(
  pages: Array<{ width: number; height: number; stream: string }>,
): Uint8Array {
  const n = pages.length;
  if (n < 1) throw new Error("PDF needs at least one page");

  const maxId = 2 + 2 * n;
  const bodies: string[] = new Array(maxId + 1);
  bodies[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  let cid = 3;
  const pageObjIds: number[] = [];
  for (let i = 0; i < n; i++) {
    const { width: w, height: h, stream } = pages[i];
    const inner = stream.endsWith("\n") ? stream : `${stream}\n`;
    const streamBytes = Buffer.byteLength(inner, "utf8");
    bodies[cid] = `<< /Length ${streamBytes} >>\nstream\n${inner}endstream`;
    const pageId = cid + 1;
    pageObjIds.push(pageId);
    bodies[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${cid} 0 R ` +
      `/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> ` +
      `/F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> >>`;
    cid += 2;
  }

  const kids = pageObjIds.map((id) => `${id} 0 R`).join(" ");
  bodies[2] = `<< /Type /Pages /Kids [ ${kids} ] /Count ${n} >>`;

  const header = Buffer.from("%PDF-1.4\n", "utf8");
  const xrefPositions: number[] = new Array(maxId + 1).fill(0);
  const chunks: Buffer[] = [header];
  let pos = header.length;

  for (let i = 1; i <= maxId; i++) {
    const body = bodies[i];
    if (body === undefined) throw new Error(`Missing PDF object ${i}`);
    xrefPositions[i] = pos;
    const chunk = Buffer.from(`${i} 0 obj\n${body}\nendobj\n`, "utf8");
    chunks.push(chunk);
    pos += chunk.length;
  }

  const xrefOffset = pos;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxId; i++) {
    xref += `${String(xrefPositions[i]).padStart(10, "0")} 00000 n \n`;
  }
  const tail = `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref + tail, "utf8"));

  return new Uint8Array(Buffer.concat(chunks));
}
