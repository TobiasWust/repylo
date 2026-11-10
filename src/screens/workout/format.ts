import type { TemplateSet } from "../../domain/model";
import type { Progression } from "../../domain/progression";
import type { Pr } from "../../domain/stats";
import { formatDuration, formatNumber, toUnit } from "../../domain/units";
import type { App } from "../../ui/context";

export const describeSets = (app: App, sets: readonly TemplateSet[], metric: string): string => {
  const { t, lang, data } = app;
  if (sets.length === 0) return "";
  if (metric === "time" || metric === "cardio") return sets.map((s) => formatDuration(s.duration ?? 0) + (s.distance ? ` · ${formatNumber((s.distance ?? 0) / 1000, lang, 2)} km` : "")).join(", ");
  // Group identical sets: "3 × 10 @ 60 kg"
  const groups: { weight: number | null; reps: number | null; count: number }[] = [];
  for (const s of sets) {
    const last = groups.at(-1);
    if (last && last.weight === s.weight && last.reps === s.reps) last.count++;
    else groups.push({ weight: s.weight, reps: s.reps, count: 1 });
  }
  return groups
    .map((g) => `${g.count > 1 ? `${g.count} × ` : ""}${g.reps ?? "–"}${g.weight ? ` @ ${formatNumber(toUnit(g.weight, data.settings.unit), lang)} ${data.settings.unit}` : metric === "bodyweight" ? t(" Wdh.", " reps") : ""}`)
    .join(", ");
};

export const progressionLabel = (app: App, p: Progression): string => {
  const { t } = app;
  switch (p.kind) {
    case "addWeight":
      return t("Mehr Gewicht", "Add weight");
    case "addReps":
      return t("Eine Wdh. mehr", "One more rep");
    case "deload":
      return t("Leichter (Deload)", "Lighter (deload)");
    case "addTime":
      return t("+5 Sekunden", "+5 seconds");
    case "repeat":
      return t("Wiederholen", "Repeat");
  }
};

export const prMessage = (app: App, pr: Pr, exerciseName: string): string => {
  const { t, weight, lang } = app;
  switch (pr.kind) {
    case "weight":
      return t(`Neues Maximalgewicht: ${weight(pr.value)} bei ${exerciseName}!`, `New heaviest weight: ${weight(pr.value)} on ${exerciseName}!`);
    case "e1rm":
      return t(`Neues geschätztes 1RM: ${weight(pr.value)} bei ${exerciseName}!`, `New estimated 1RM: ${weight(pr.value)} on ${exerciseName}!`);
    case "reps":
      return t(`${pr.value} Wiederholungen – Rekord bei ${exerciseName}!`, `${pr.value} reps – a record on ${exerciseName}!`);
    case "duration":
      return t(`Neue Bestzeit: ${formatDuration(pr.value)} bei ${exerciseName}!`, `New best time: ${formatDuration(pr.value)} on ${exerciseName}!`);
    case "volume":
      return t(`Volumenrekord bei ${exerciseName}: ${formatNumber(toUnit(pr.value, app.data.settings.unit), lang, 0)} ${app.data.settings.unit}!`, `Volume record on ${exerciseName}: ${formatNumber(toUnit(pr.value, app.data.settings.unit), lang, 0)} ${app.data.settings.unit}!`);
  }
};
