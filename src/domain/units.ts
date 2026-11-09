import type { Unit } from "./model";

const LB_PER_KG = 2.2046226218;

/** Weights are stored in kg; these convert at the UI boundary. */
export const toUnit = (kg: number, unit: Unit): number => (unit === "kg" ? kg : kg * LB_PER_KG);
export const fromUnit = (value: number, unit: Unit): number => (unit === "kg" ? value : value / LB_PER_KG);

/** Display with at most one decimal and no trailing ".0". */
export const formatNumber = (value: number, language: string, decimals = 1): string =>
  new Intl.NumberFormat(language, { maximumFractionDigits: decimals }).format(value);

export const formatWeight = (kg: number, unit: Unit, language: string): string =>
  `${formatNumber(toUnit(kg, unit), language)} ${unit}`;

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
};

/** Parses "1:30", "90" or "1:02:00" into seconds. */
export const parseDuration = (text: string): number | null => {
  const parts = text.trim().split(":").map(Number);
  if (parts.length === 0 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  return parts.reduce((total, p) => total * 60 + p, 0);
};
