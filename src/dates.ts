/** Date helpers working on ISO date strings (YYYY-MM-DD) without timezone surprises. */

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

/** 1 = Monday ... 7 = Sunday */
export function weekdayOf(iso: string): number {
  const w = parseISODate(iso).getUTCDay();
  return w === 0 ? 7 : w;
}

export function isWeekend(iso: string): boolean {
  return weekdayOf(iso) >= 6;
}

export function mondayOf(iso: string): string {
  return addDays(iso, 1 - weekdayOf(iso));
}

/** ISO 8601 calendar week number. */
export function isoWeek(iso: string): { week: number; year: number } {
  const d = parseISODate(iso);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export function hhmmToMinutes(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Extract the wall-clock HH:MM from an ISO timestamp as exported (local time with offset). */
export function isoToHHMM(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /T(\d{2}:\d{2})/.exec(s);
  if (m) return m[1];
  return /^\d{2}:\d{2}/.test(s) ? s.slice(0, 5) : null;
}

/** Current date (YYYY-MM-DD) and minutes since midnight in the given IANA time zone. */
export function nowIn(timeZone: string | undefined, now: Date = new Date()): { date: string; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      minutes: Number(get("hour")) * 60 + Number(get("minute")),
    };
  } catch {
    const p2 = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`,
      minutes: now.getHours() * 60 + now.getMinutes(),
    };
  }
}
