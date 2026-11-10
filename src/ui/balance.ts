import type { BalanceKey } from "../domain/balance";

export type BalanceSide = { de: string; en: string; tipDe: string; tipEn: string };

/** Names of both sides of each balance pair, and exercises that train them. */
export const balanceSides: Record<BalanceKey, [left: BalanceSide, right: BalanceSide]> = {
  pushPull: [
    { de: "Drücken", en: "Push", tipDe: "Bankdrücken, Schulterdrücken, Dips", tipEn: "bench press, overhead press, dips" },
    { de: "Ziehen", en: "Pull", tipDe: "Rudern, Klimmzüge, Latzug", tipEn: "rows, pull-ups, lat pulldowns" },
  ],
  quadsHamstrings: [
    { de: "Quadrizeps", en: "Quads", tipDe: "Kniebeuge, Beinpresse, Ausfallschritte", tipEn: "squats, leg press, lunges" },
    { de: "Beinbeuger", en: "Hamstrings", tipDe: "Beincurls, Rumänisches Kreuzheben", tipEn: "leg curls, Romanian deadlifts" },
  ],
  frontRearDelts: [
    { de: "Schultern", en: "Shoulders", tipDe: "Schulterdrücken, Seitheben", tipEn: "overhead press, lateral raises" },
    { de: "Hintere Schulter", en: "Rear delts", tipDe: "Face Pulls, Reverse Flys", tipEn: "face pulls, reverse flyes" },
  ],
  bicepsTriceps: [
    { de: "Bizeps", en: "Biceps", tipDe: "Curls", tipEn: "curls" },
    { de: "Trizeps", en: "Triceps", tipDe: "Trizepsdrücken, Dips, French Press", tipEn: "pushdowns, dips, skull crushers" },
  ],
  absLowerBack: [
    { de: "Bauch", en: "Abs", tipDe: "Plank, Crunches, Beinheben", tipEn: "planks, crunches, leg raises" },
    { de: "Unterer Rücken", en: "Lower back", tipDe: "Hyperextensions, Kreuzheben", tipEn: "back extensions, deadlifts" },
  ],
  upperLower: [
    { de: "Oberkörper", en: "Upper body", tipDe: "Drück- und Zugübungen", tipEn: "pushing and pulling" },
    { de: "Unterkörper", en: "Lower body", tipDe: "Kniebeuge, Beinpresse, Kreuzheben", tipEn: "squats, leg press, deadlifts" },
  ],
};
