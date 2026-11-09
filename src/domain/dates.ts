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
