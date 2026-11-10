/** Weight step per tap, by equipment and unit (EGYM adjusts in 1 kg steps, kettlebells come in 4 kg jumps). */
export const weightStep = (equipment: string, unit: "kg" | "lb"): number => {
  if (equipment === "kettlebell") return unit === "lb" ? 8 : 4;
  if (unit === "lb") return equipment === "egym" || equipment === "dumbbell" ? 2.5 : 5;
  return equipment === "egym" || equipment === "dumbbell" || equipment === "other" ? 1 : 2.5;
};
