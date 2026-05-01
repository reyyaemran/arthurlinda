/** Parse `YYYY-MM-DDTHH:mm` as wall clock in IANA `timeZone` → UTC `Date`. */
export function wallLocalToUtcDate(wall: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wall.trim());
  if (!m) {
    throw new Error(`Invalid wall datetime (use YYYY-MM-DDTHH:mm): ${wall}`);
  }
  const want: [number, number, number, number, number] = [
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  ];

  const partsFromMs = (ms: number) => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const p = fmt.formatToParts(new Date(ms));
    const n = (t: Intl.DateTimeFormatPart["type"]) =>
      Number(p.find((x) => x.type === t)?.value ?? "NaN");
    return [n("year"), n("month"), n("day"), n("hour"), n("minute")] as const;
  };

  const cmp5 = (
    a: readonly [number, number, number, number, number],
    b: readonly [number, number, number, number, number],
  ) => {
    for (let i = 0; i < 5; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  };

  const naive = Date.UTC(want[0], want[1] - 1, want[2], want[3], want[4], 0, 0);
  let lo = naive - 3 * 24 * 3600000;
  let hi = naive + 3 * 24 * 3600000;

  for (let iter = 0; iter < 80 && hi - lo > 500; iter++) {
    const mid = Math.floor((lo + hi) / 2);
    const z = partsFromMs(mid);
    const c = cmp5(z, want);
    if (c === 0) return new Date(mid);
    if (c < 0) lo = mid;
    else hi = mid;
  }

  for (let t = lo; t <= hi; t += 60000) {
    if (cmp5(partsFromMs(t), want) === 0) return new Date(t);
  }

  return new Date(naive);
}

/** UTC ISO string → `YYYY-MM-DDTHH:mm` wall clock in IANA `timeZone` (for `<input type="datetime-local">`). */
export function utcIsoToWallDatetimeLocal(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = fmt.formatToParts(d);
  const g = (ty: Intl.DateTimeFormatPart["type"]) =>
    p.find((x) => x.type === ty)?.value ?? "";
  const y = g("year");
  const mo = g("month");
  const day = g("day");
  let h = g("hour");
  let min = g("minute");
  if (h.length === 1) h = `0${h}`;
  if (min.length === 1) min = `0${min}`;
  return `${y}-${mo}-${day}T${h}:${min}`;
}
