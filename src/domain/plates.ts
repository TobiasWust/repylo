import type { Unit } from "./model";

export const platesKg = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const platesLb = [45, 35, 25, 10, 5, 2.5] as const;

export interface PlateResult {
  /** Plates for ONE side, heaviest first. */
  readonly perSide: readonly number[];
  /** Weight that can't be built with the available plates (per side). */
  readonly remainder: number;
}

/** Greedy works for standard plate sets because each plate is ≥ the sum rule's needs. */
export const calculatePlates = (target: number, bar: number, unit: Unit): PlateResult => {
  const plates = unit === "kg" ? platesKg : platesLb;
  let perSideLeft = Math.max(0, (target - bar) / 2);
  const perSide: number[] = [];
  for (const plate of plates) {
    while (perSideLeft >= plate - 1e-9) {
      perSide.push(plate);
      perSideLeft -= plate;
    }
  }
  return { perSide, remainder: Math.round(perSideLeft * 100) / 100 };
};
