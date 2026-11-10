import { parseDay } from "../domain/dates";
import type { Equipment, Metric, Muscle, Pattern } from "../domain/exercises";
import type { Goal, Language } from "../domain/model";

const muscleNames: Record<Muscle, [de: string, en: string]> = {
  chest: ["Brust", "Chest"],
  lats: ["Latissimus", "Lats"],
  upperBack: ["Oberer Rücken", "Upper back"],
  lowerBack: ["Unterer Rücken", "Lower back"],
  shoulders: ["Schultern", "Shoulders"],
  rearDelts: ["Hintere Schulter", "Rear delts"],
  biceps: ["Bizeps", "Biceps"],
  triceps: ["Trizeps", "Triceps"],
  forearms: ["Unterarme", "Forearms"],
  abs: ["Bauch", "Abs"],
  quads: ["Quadrizeps", "Quads"],
  hamstrings: ["Beinbeuger", "Hamstrings"],
  glutes: ["Gesäß", "Glutes"],
  adductors: ["Adduktoren", "Adductors"],
  calves: ["Waden", "Calves"],
};
export const muscleName = (m: Muscle, lang: Language) => muscleNames[m][lang === "de" ? 0 : 1];

/** Picks the singular or plural word for a count. */
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Muscle names that take a plural verb ("Waden kommen", "Calves need"). */
const pluralNames: Record<Language, ReadonlySet<Muscle>> = {
  de: new Set(["shoulders", "forearms", "hamstrings", "adductors", "calves"]),
  en: new Set(["lats", "shoulders", "rearDelts", "forearms", "abs", "quads", "hamstrings", "glutes", "adductors", "calves"]),
};
export const isPluralMuscle = (m: Muscle, lang: Language) => pluralNames[lang].has(m);

const goalNames: Record<Goal, [string, string]> = {
  strength: ["Kraft", "Strength"],
  hypertrophy: ["Muskelaufbau", "Hypertrophy"],
  endurance: ["Kraftausdauer", "Endurance"],
};
export const goalName = (g: Goal, lang: Language) => goalNames[g][lang === "de" ? 0 : 1];

/** Compact labels for segmented controls. */
const goalShortNames: Record<Goal, [string, string]> = {
  strength: ["Kraft", "Strength"],
  hypertrophy: ["Aufbau", "Muscle"],
  endurance: ["Ausdauer", "Endurance"],
};
export const goalShort = (g: Goal, lang: Language) => goalShortNames[g][lang === "de" ? 0 : 1];

const equipmentNames: Record<Equipment, [string, string]> = {
  barbell: ["Langhantel", "Barbell"],
  dumbbell: ["Kurzhantel", "Dumbbell"],
  kettlebell: ["Kettlebell", "Kettlebell"],
  machine: ["Maschine", "Machine"],
  egym: ["EGYM", "EGYM"],
  cable: ["Kabelzug", "Cable"],
  bodyweight: ["Körpergewicht", "Bodyweight"],
  cardio: ["Cardio", "Cardio"],
  other: ["Sonstiges", "Other"],
};
export const equipmentName = (e: Equipment, lang: Language) => equipmentNames[e][lang === "de" ? 0 : 1];

const metricNames: Record<Metric, [string, string]> = {
  weight: ["Gewicht × Wdh.", "Weight × reps"],
  bodyweight: ["Wdh. (+ Zusatzgewicht)", "Reps (+ added weight)"],
  time: ["Zeit", "Time"],
  cardio: ["Zeit + Strecke", "Time + distance"],
};
export const metricName = (m: Metric, lang: Language) => metricNames[m][lang === "de" ? 0 : 1];

const patternNames: Record<Pattern, [string, string]> = {
  push: ["Drücken", "Push"],
  pull: ["Ziehen", "Pull"],
  legs: ["Beine", "Legs"],
  core: ["Rumpf", "Core"],
  cardio: ["Cardio", "Cardio"],
};
export const patternName = (p: Pattern, lang: Language) => patternNames[p][lang === "de" ? 0 : 1];

export const formatDate = (day: string, lang: Language, style: "long" | "short" = "short") =>
  parseDay(day).toLocaleDateString(
    lang,
    style === "long" ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" },
  );

export const formatMonth = (day: string, lang: Language) => parseDay(day).toLocaleDateString(lang, { month: "long", year: "numeric" });

/** "2026-10" → "Oktober" / "October". */
export const monthName = (month: string, lang: Language) => parseDay(`${month}-15`).toLocaleDateString(lang, { month: "long" });
