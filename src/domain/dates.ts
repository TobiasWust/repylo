/** Calendar-day helpers. Days are local "YYYY-MM-DD" strings. */

const pad = (n: number) => String(n).padStart(2, "0");

export const toDay = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const today = (): string => toDay(new Date());

/** Noon avoids DST edge cases when doing day arithmetic. */
export const parseDay = (day: string): Date => new Date(`${day}T12:00:00`);

export const addDays = (day: string, days: number): string => {
  const d = parseDay(day);
  d.setDate(d.getDate() + days);
  return toDay(d);
};

export const daysBetween = (from: string, to: string): number =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);

/** Monday of the week containing `day`. */
export const weekStart = (day: string): string => {
  const d = parseDay(day);
  const offset = (d.getDay() + 6) % 7;
  return addDays(day, -offset);
};

/**
 * Formats a day for typing: "10.11.2026" (de) or "11/10/2026" (en). Native
 * date inputs follow the browser's language instead of the app's, so the app
 * uses its own text field with this format.
 */
export const dayToInput = (day: string, lang: "de" | "en"): string => {
  const [y, m, d] = day.split("-");
  return lang === "de" ? `${d}.${m}.${y}` : `${m}/${d}/${y}`;
};

/**
 * Parses what a user typed into a day. Accepts "10.11.2026", "10.11.26" and
 * "10.11." (current year) in German, "11/10/2026" etc. in English, and ISO
 * "2026-11-10" in both. Returns null for anything that isn't a real date.
 */
export const parseDayInput = (text: string, lang: "de" | "en", reference: string = today()): string | null => {
  const trimmed = text.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const local = lang === "de" ? /^(\d{1,2})\.(\d{1,2})\.?(\d{2}|\d{4})?$/.exec(trimmed) : /^(\d{1,2})\/(\d{1,2})\/?(\d{2}|\d{4})?$/.exec(trimmed);
  let year: number, month: number, dayOfMonth: number;
  if (iso) [year, month, dayOfMonth] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (local) {
    const [a, b] = [Number(local[1]), Number(local[2])];
    [dayOfMonth, month] = lang === "de" ? [a, b] : [b, a];
    const y = local[3];
    year = y === undefined ? Number(reference.slice(0, 4)) : y.length === 2 ? 2000 + Number(y) : Number(y);
  } else return null;
  const date = new Date(year, month - 1, dayOfMonth, 12);
  // Rejects overflow like 31.02., which Date would roll into March.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== dayOfMonth) return null;
  return toDay(date);
};
